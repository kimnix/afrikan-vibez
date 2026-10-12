import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { GlassCard } from '../../components/ui/GlassCard'
import { ApiError, listAdminPromos, upsertAdminPromo } from '../../lib/api'
import { formatMoney } from '../../lib/format'
import type { Promo, PromoInput, PromoKind } from '../../types'

interface PromoForm {
  code: string
  kind: PromoKind
  value: string
  label: string
  active: boolean
  min: string
  max: string
}

const emptyForm: PromoForm = {
  code: '',
  kind: 'percent',
  value: '',
  label: '',
  active: true,
  min: '',
  max: '',
}

export function AdminPromosPage() {
  const { accessToken } = useAuth()

  const [promos, setPromos] = useState<Promo[] | null>(null)
  const [form, setForm] = useState<PromoForm>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function load() {
    if (!accessToken) return
    listAdminPromos(accessToken)
      .then(setPromos)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load promos.'),
      )
  }

  useEffect(load, [accessToken])

  function startEdit(promo: Promo) {
    setMessage(null)
    setError(null)
    setForm({
      code: promo.code,
      kind: promo.kind,
      value:
        promo.kind === 'percent' ? String(promo.value) : String(promo.value / 100),
      label: promo.label,
      active: promo.active,
      min: promo.minSubtotalMinor != null ? String(promo.minSubtotalMinor / 100) : '',
      max: promo.maxDiscountMinor != null ? String(promo.maxDiscountMinor / 100) : '',
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!accessToken) return
    setBusy(true)
    setError(null)
    setMessage(null)

    const payload: PromoInput = {
      code: form.code.trim().toUpperCase(),
      kind: form.kind,
      value:
        form.kind === 'percent'
          ? Math.round(Number(form.value))
          : Math.round((Number(form.value) || 0) * 100),
      label: form.label.trim(),
      active: form.active,
      minSubtotalMinor: form.min === '' ? null : Math.round((Number(form.min) || 0) * 100),
      maxDiscountMinor: form.max === '' ? null : Math.round((Number(form.max) || 0) * 100),
    }

    try {
      await upsertAdminPromo(payload, accessToken)
      setMessage(`Saved promo ${payload.code}.`)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the promo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-cream">Promo codes</h2>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      )}

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-ash">
              <tr>
                <th className="px-5 py-3 font-semibold">Code</th>
                <th className="px-5 py-3 font-semibold">Discount</th>
                <th className="px-5 py-3 font-semibold">Conditions</th>
                <th className="px-5 py-3 font-semibold">Active</th>
                <th className="px-5 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(promos ?? []).map((promo) => (
                <tr key={promo.code} className="hover:bg-white/[0.03]">
                  <td className="px-5 py-4">
                    <p className="font-mono font-semibold text-cream">{promo.code}</p>
                    <p className="text-xs text-subtle">{promo.label}</p>
                  </td>
                  <td className="px-5 py-4 text-cream">
                    {promo.kind === 'percent'
                      ? `${promo.value}%`
                      : formatMoney(promo.value, 'gbp')}
                  </td>
                  <td className="px-5 py-4 text-xs text-subtle">
                    {promo.minSubtotalMinor != null &&
                      `Min ${formatMoney(promo.minSubtotalMinor, 'gbp')}`}
                    {promo.minSubtotalMinor != null && promo.maxDiscountMinor != null && ' · '}
                    {promo.maxDiscountMinor != null &&
                      `Max ${formatMoney(promo.maxDiscountMinor, 'gbp')}`}
                    {promo.minSubtotalMinor == null && promo.maxDiscountMinor == null && '—'}
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={promo.active ? 'success' : 'neutral'}>
                      {promo.active ? 'active' : 'inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(promo)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {promos && promos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-subtle">
                    No promo codes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4 p-6">
        <h3 className="font-display text-base font-bold text-cream">Create or update a promo</h3>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Code</span>
              <input
                value={form.code}
                required
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 font-mono text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Type</span>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as PromoKind })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              >
                <option value="percent" className="bg-ink">Percent off</option>
                <option value="amount" className="bg-ink">Amount off</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">
                Value {form.kind === 'percent' ? '(%)' : '(£)'}
              </span>
              <input
                value={form.value}
                required
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Label</span>
              <input
                value={form.label}
                required
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Min subtotal (£)</span>
              <input
                value={form.min}
                onChange={(e) => setForm({ ...form, min: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Max discount (£)</span>
              <input
                value={form.max}
                onChange={(e) => setForm({ ...form, max: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="flex items-end gap-2 pb-3 text-sm text-subtle">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 accent-[#e7c36a]"
              />
              Active
            </label>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save promo'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>
              Clear
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}
