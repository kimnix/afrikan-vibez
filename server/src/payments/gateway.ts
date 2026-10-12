import type { PaymentProviderName, Purchaser } from '../domain/types.js'
import { env } from '../env.js'

export interface PaymentStartInput {
  reference: string
  amountMinor: number
  currency: string
  purchaser: Purchaser
  description: string
}

export interface PaymentInit {
  provider: PaymentProviderName
  amountMinor: number
  currency: string
  /** Provider-side identifier (e.g. Stripe Checkout Session id), when available. */
  paymentRef: string | null
  /** Hosted checkout URL to redirect the customer to, when applicable. */
  redirectUrl?: string
}

export interface PaymentGateway {
  readonly name: PaymentProviderName
  start(input: PaymentStartInput): Promise<PaymentInit>
}

/** A value is considered configured when set and not a REPLACE_WITH placeholder. */
export function isConfigured(value: string | undefined): boolean {
  return Boolean(value && value.length > 0 && !value.startsWith('REPLACE_WITH'))
}

export function isStripeConfigured(): boolean {
  return isConfigured(env.stripeSecretKey) && isConfigured(env.stripeWebhookSecret)
}

class MockGateway implements PaymentGateway {
  readonly name = 'mock' as const

  async start(input: PaymentStartInput): Promise<PaymentInit> {
    return {
      provider: 'mock',
      amountMinor: input.amountMinor,
      currency: input.currency,
      paymentRef: null,
    }
  }
}

class StripeGateway implements PaymentGateway {
  readonly name = 'stripe' as const

  constructor(private readonly secretKey: string) {}

  async start(input: PaymentStartInput): Promise<PaymentInit> {
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(this.secretKey)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.purchaser.email,
      success_url: `${env.clientOrigin}/checkout/confirmation?ref=${encodeURIComponent(input.reference)}`,
      cancel_url: `${env.clientOrigin}/checkout/review`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountMinor,
            product_data: { name: input.description },
          },
        },
      ],
      metadata: { bookingReference: input.reference },
    })

    return {
      provider: 'stripe',
      amountMinor: input.amountMinor,
      currency: input.currency,
      paymentRef: session.id,
      redirectUrl: session.url ?? undefined,
    }
  }
}

export function getPaymentGateway(): PaymentGateway {
  if (env.paymentsMode === 'stripe') {
    if (isConfigured(env.stripeSecretKey)) {
      return new StripeGateway(env.stripeSecretKey)
    }
    console.warn(
      '[payments] PAYMENTS_MODE=stripe but STRIPE_SECRET_KEY is missing; falling back to the mock gateway.',
    )
  }
  return new MockGateway()
}
