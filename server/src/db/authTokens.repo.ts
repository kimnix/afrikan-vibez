import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from './client.js'
import { DatabaseUnavailableError } from './users.repo.js'
import { authTokens, type AuthTokenRow } from './schema.js'

export type AuthTokenKind = 'email_verify' | 'password_reset'

function requireDb() {
  if (!db) throw new DatabaseUnavailableError()
  return db
}

export async function createAuthToken(values: {
  userId: string
  kind: AuthTokenKind
  tokenHash: string
  expiresAt: Date
}): Promise<void> {
  const database = requireDb()
  await database.insert(authTokens).values(values)
}

/** A token that exists, is unused and has not expired. */
export async function findValidAuthToken(
  kind: AuthTokenKind,
  tokenHash: string,
): Promise<AuthTokenRow | undefined> {
  const database = requireDb()
  const [row] = await database
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.kind, kind),
        eq(authTokens.tokenHash, tokenHash),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1)
  return row
}

export async function consumeAuthToken(id: string): Promise<void> {
  const database = requireDb()
  await database
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.id, id))
}

/** Invalidate any outstanding tokens of a kind (e.g. before issuing a new one). */
export async function invalidateAuthTokens(
  userId: string,
  kind: AuthTokenKind,
): Promise<void> {
  const database = requireDb()
  await database
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind), isNull(authTokens.usedAt)))
}
