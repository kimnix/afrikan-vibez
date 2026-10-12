import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { env } from '../env.js'
import * as schema from './schema.js'

export type Database = NodePgDatabase<typeof schema>

let pool: pg.Pool | null = null
let database: Database | null = null

if (env.databaseUrl) {
  pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 })
  pool.on('error', (err) => {
    console.error('[db] idle client error:', err.message)
  })
  database = drizzle(pool, { schema })
}

/**
 * The Drizzle client, or `null` when DATABASE_URL is not configured. Callers
 * should generally go through the repositories, which fall back to seed data
 * when the database is unavailable.
 */
export const db = database

export function isDbConfigured(): boolean {
  return db !== null
}

export async function closeDb(): Promise<void> {
  await pool?.end()
}
