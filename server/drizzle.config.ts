import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load the repo-root .env whether drizzle-kit runs from ./server or the root.
for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
]) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate })
    break
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL is not set — copy .env.example to .env first.')
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: { url },
  verbose: true,
  strict: true,
})
