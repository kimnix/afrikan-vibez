import { describe, expect, it } from 'vitest'
import { isAllowedOrigin } from '../src/env.js'

describe('isAllowedOrigin', () => {
  it('accepts the configured origin', () => {
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true)
  })

  it('accepts alternate localhost ports used during local development', () => {
    expect(isAllowedOrigin('http://localhost:5175')).toBe(true)
    expect(isAllowedOrigin('http://127.0.0.1:5175')).toBe(true)
  })

  it('rejects unrelated origins', () => {
    expect(isAllowedOrigin('https://example.com')).toBe(false)
  })
})
