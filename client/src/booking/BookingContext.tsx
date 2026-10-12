import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AttendeeInput,
  PurchaserInput,
  TicketCategoryKey,
} from '../types'

export interface BookingSelection {
  eventSlug: string
  ticketTypeKey: TicketCategoryKey
  quantity: number
  groupSize: number | null
}

export interface BookingState {
  selection: BookingSelection | null
  attendees: AttendeeInput[]
  purchaser: PurchaserInput | null
  promoCode: string | null
}

const STORAGE_KEY = 'av.booking.v1'

const initialState: BookingState = {
  selection: null,
  attendees: [],
  purchaser: null,
  promoCode: null,
}

function load(): BookingState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<BookingState>
    return { ...initialState, ...parsed }
  } catch {
    return initialState
  }
}

interface BookingContextValue {
  state: BookingState
  setSelection: (selection: BookingSelection) => void
  setAttendees: (attendees: AttendeeInput[]) => void
  setPurchaser: (purchaser: PurchaserInput) => void
  setPromoCode: (code: string | null) => void
  reset: () => void
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(load)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage may be unavailable (private mode); the flow still works in-memory.
    }
  }, [state])

  const setSelection = useCallback((selection: BookingSelection) => {
    setState((s) => {
      const changed =
        s.selection?.eventSlug !== selection.eventSlug ||
        s.selection?.ticketTypeKey !== selection.ticketTypeKey ||
        s.selection?.quantity !== selection.quantity ||
        s.selection?.groupSize !== selection.groupSize
      return {
        ...s,
        selection,
        // Changing the selection invalidates captured attendees.
        attendees: changed ? [] : s.attendees,
      }
    })
  }, [])

  const setAttendees = useCallback((attendees: AttendeeInput[]) => {
    setState((s) => ({ ...s, attendees }))
  }, [])

  const setPurchaser = useCallback((purchaser: PurchaserInput) => {
    setState((s) => ({ ...s, purchaser }))
  }, [])

  const setPromoCode = useCallback((promoCode: string | null) => {
    setState((s) => ({ ...s, promoCode }))
  }, [])

  const reset = useCallback(() => setState(initialState), [])

  const value = useMemo(
    () => ({ state, setSelection, setAttendees, setPurchaser, setPromoCode, reset }),
    [state, setSelection, setAttendees, setPurchaser, setPromoCode, reset],
  )

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  )
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext)
  if (!ctx) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return ctx
}
