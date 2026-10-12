import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

/**
 * Apply migrations to the test database once, before the suite runs. If the
 * database is unreachable the suite still starts (unit tests run); the
 * integration tests skip themselves when the schema is missing.
 */
export default async function globalSetup(): Promise<void> {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5433/african_vibes_test'
  const migrationsFolder = resolve(process.cwd(), 'drizzle')
  if (!existsSync(migrationsFolder)) return

  const pool = new pg.Pool({ connectionString: url, max: 1 })
  try {
    await migrate(drizzle(pool), { migrationsFolder })
  } catch (err) {
    console.warn(
      `[test] Could not prepare the test database (${(err as Error).message}). ` +
        'Database-backed tests will be skipped.',
    )
  } finally {
    await pool.end()
  }
}
