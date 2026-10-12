import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import {
  createOpaqueToken,
  createRefreshToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from '../src/auth/tokens.js'

describe('access tokens', () => {
  it('round-trips the subject and role', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'admin' })
    expect(verifyAccessToken(token)).toEqual({ sub: 'user-1', role: 'admin' })
  })

  it('defaults the role to customer when absent', () => {
    const token = jwt.sign({ sub: 'user-2' }, process.env.JWT_ACCESS_SECRET!)
    expect(verifyAccessToken(token).role).toBe('customer')
  })

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign({ sub: 'user-3' }, 'some-other-secret')
    expect(() => verifyAccessToken(token)).toThrow()
  })
})

describe('opaque tokens', () => {
  it('hashes the raw value deterministically', () => {
    const { raw, hash } = createOpaqueToken()
    expect(hashToken(raw)).toBe(hash)
    expect(hash).not.toBe(raw)
  })

  it('never repeats a raw token', () => {
    expect(createOpaqueToken().raw).not.toBe(createOpaqueToken().raw)
  })

  it('issues refresh tokens as opaque values too', () => {
    const { raw, hash } = createRefreshToken()
    expect(raw.length).toBeGreaterThan(20)
    expect(hashToken(raw)).toBe(hash)
  })
})
