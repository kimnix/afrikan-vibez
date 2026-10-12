import { useEffect, useState } from 'react'

export type CountdownPhase = 'upcoming' | 'live' | 'ended'

export interface CountdownValue {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
  phase: CountdownPhase
}

function breakdown(ms: number) {
  const total = Math.max(0, ms)
  const seconds = Math.floor(total / 1000)
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  }
}

/**
 * Live countdown to an absolute instant. Recomputes every second, clamps at
 * zero and reports whether the event is upcoming, live or ended. The passed
 * instants are absolute (ISO-8601), so the countdown is timezone-independent;
 * the event timezone only affects how dates are displayed.
 */
export function useCountdown(startIso: string, endIso?: string): CountdownValue {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : start
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const phase: CountdownPhase =
    now < start ? 'upcoming' : now < end ? 'live' : 'ended'

  const remaining = start - now
  const parts = breakdown(phase === 'upcoming' ? remaining : 0)

  return {
    ...parts,
    totalMs: Math.max(0, remaining),
    phase,
  }
}
