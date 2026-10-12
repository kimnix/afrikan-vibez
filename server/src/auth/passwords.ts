import { compare, hash } from 'bcryptjs'

/** Cost factor for password hashing. 12 is a good balance for 2020s hardware. */
const ROUNDS = 12

/** Minimum password length enforced at the API boundary. */
export const MIN_PASSWORD_LENGTH = 8

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ROUNDS)
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await compare(password, passwordHash)
  } catch {
    return false
  }
}
