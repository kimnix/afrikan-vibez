import { and, eq, isNull } from 'drizzle-orm'
import { db } from './client.js'
import {
  refreshTokens,
  users,
  type NewUserRow,
  type RefreshTokenRow,
  type UserRow,
} from './schema.js'

export class DatabaseUnavailableError extends Error {
  constructor() {
    super('Database is not configured.')
    this.name = 'DatabaseUnavailableError'
  }
}

function requireDb() {
  if (!db) throw new DatabaseUnavailableError()
  return db
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const database = requireDb()
  const [row] = await database
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)
  return row
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const database = requireDb()
  const [row] = await database.select().from(users).where(eq(users.id, id)).limit(1)
  return row
}

export async function createUser(values: NewUserRow): Promise<UserRow> {
  const database = requireDb()
  const [row] = await database
    .insert(users)
    .values({ ...values, email: values.email.trim().toLowerCase() })
    .returning()
  return row!
}

export async function storeRefreshToken(values: {
  userId: string
  tokenHash: string
  expiresAt: Date
  userAgent?: string | null
  ip?: string | null
}): Promise<void> {
  const database = requireDb()
  await database.insert(refreshTokens).values(values)
}

export async function findActiveRefreshToken(
  tokenHash: string,
): Promise<RefreshTokenRow | undefined> {
  const database = requireDb()
  const [row] = await database
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
    .limit(1)
  return row
}

export async function revokeRefreshToken(id: string): Promise<void> {
  const database = requireDb()
  await database
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, id))
}

export async function revokeTokensForUser(userId: string): Promise<void> {
  const database = requireDb()
  await database
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
}

export async function markEmailVerified(userId: string): Promise<void> {
  const database = requireDb()
  await database
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))
}

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  const database = requireDb()
  await database
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId))
}
