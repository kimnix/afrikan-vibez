import { eq } from 'drizzle-orm'
import { hashPassword, MIN_PASSWORD_LENGTH } from '../auth/passwords.js'
import { closeDb, db } from './client.js'
import { users } from './schema.js'
import {
  createUser,
  findUserByEmail,
  updatePasswordHash,
} from './users.repo.js'

if (!db) {
  console.error('DATABASE_URL is not configured — cannot bootstrap an admin.')
  process.exit(1)
}

const database = db
const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD ?? ''
const firstName = process.env.ADMIN_FIRST_NAME ?? 'Admin'
const lastName = process.env.ADMIN_LAST_NAME ?? 'User'
/** Reset the password of an existing account (otherwise it is left untouched). */
const resetPassword = process.env.ADMIN_RESET_PASSWORD === 'true'

try {
  if (!email.includes('@')) {
    throw new Error('Set ADMIN_EMAIL to a valid email address.')
  }

  const existing = await findUserByEmail(email)
  if (existing) {
    await database
      .update(users)
      .set({
        role: 'admin',
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))

    if (resetPassword) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(
          `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters to reset it.`,
        )
      }
      await updatePasswordHash(existing.id, await hashPassword(password))
    }
    console.log(`Promoted existing account to admin: ${email}`)
  } else {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters to create the account.`,
      )
    }
    await createUser({
      email,
      passwordHash: await hashPassword(password),
      firstName,
      lastName,
      role: 'admin',
      emailVerifiedAt: new Date(),
    })
    console.log(`Created admin account: ${email}`)
  }

  console.log('Bootstrap complete.')
} catch (err) {
  console.error('Bootstrap failed:', err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  await closeDb()
}
