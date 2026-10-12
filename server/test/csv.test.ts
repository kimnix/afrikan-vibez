import { describe, expect, it } from 'vitest'
import { toCsv } from '../src/lib/csv.js'

const BOM = '\uFEFF'

describe('toCsv', () => {
  it('returns an empty string only when there are no columns to write', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes just a header row when given columns but no rows', () => {
    expect(toCsv([], ['a', 'b'])).toBe(`${BOM}a,b`)
  })

  it('writes a BOM, a header row and CRLF line endings', () => {
    const csv = toCsv([
      { name: 'Ada', total: 30 },
      { name: 'Kofi', total: 45 },
    ])
    expect(csv.startsWith(BOM)).toBe(true)
    expect(csv).toBe(`${BOM}name,total\r\nAda,30\r\nKofi,45`)
  })

  it('quotes values containing commas, quotes or newlines and doubles quotes', () => {
    const csv = toCsv([{ note: 'a,b', quote: 'say "hi"', lines: 'one\ntwo' }], [
      'note',
      'quote',
      'lines',
    ])
    expect(csv).toBe(`${BOM}note,quote,lines\r\n"a,b","say ""hi""","one\ntwo"`)
  })

  it('renders null and undefined as empty fields', () => {
    const csv = toCsv([{ a: null, b: undefined }], ['a', 'b'])
    expect(csv).toBe(`${BOM}a,b\r\n,`)
  })

  it('honours an explicit header order', () => {
    const csv = toCsv([{ a: 1, b: 2 }], ['b', 'a'])
    expect(csv).toBe(`${BOM}b,a\r\n2,1`)
  })
})
