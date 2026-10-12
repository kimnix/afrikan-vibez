/**
 * Test environment defaults. This runs before each test file is imported, so the
 * values are in place before `env.ts` reads them (and before the database pool is
 * created). `TEST_DATABASE_URL` lets CI point at a throwaway database; the
 * default targets a local `african_vibes_test` database and never the dev one.
 */
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5433/african_vibes_test'
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-000000000000000000000000'
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-00000000000000000000000'
process.env.PAYMENTS_MODE = 'mock'
