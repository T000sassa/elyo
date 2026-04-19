import { auth } from '@/lib/auth'
import type { Session } from 'next-auth'

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code)
  }
}

export async function requireElyoAdmin(): Promise<Session> {
  const session = await auth()
  if (!session?.user) throw new HttpError(401, 'unauthorized')
  if (session.user.role !== 'ELYO_ADMIN') throw new HttpError(403, 'forbidden')
  return session
}
