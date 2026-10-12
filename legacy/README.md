# DL Events — secure ticketing starter

This is a **starter scaffold**, not a production-ready ticketing system. It demonstrates:
- Dark glassmorphism mobile landing page
- Fixed server-side demo ticket prices
- Stripe-hosted Checkout session creation
- Stripe webhook signature verification
- Stripe Connect Express hosted organiser payout onboarding
- Creator TOTP code verification endpoint (extra factor only; not a full admin login)

## Why bank details are not collected directly here
Do not build a form that stores bank account details, bank login credentials, card PINs or security codes in your app. The organiser button redirects to Stripe-hosted onboarding, where the payment provider collects the required payout information. The organiser's Stripe account ID must be saved server-side against an authenticated user in a real deployment.

## Run locally
1. Install Node.js 20+.
2. Extract this folder and open a terminal inside it.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Fill in Stripe **test-mode** credentials and other secrets.
6. Set `BASE_URL=http://localhost:3000`.
7. Run `npm start` and open `http://localhost:3000`.

For Stripe webhooks locally, install the Stripe CLI and run:
`stripe listen --forward-to localhost:3000/webhook`
Copy the printed `whsec_...` secret into `.env`, then restart the server.

## Creator authenticator seed
Generate a Base32 secret once in a trusted local environment, then store it as `CREATOR_TOTP_SECRET` in the server's secret store. Enrol it in an authenticator app by creating a TOTP entry. Do not send the seed or QR to other people, put it in frontend JavaScript, or commit it to Git.

The `/api/creator/verify` endpoint only validates a code. It does **not** create a secure admin session. Production admin actions require a proper authenticated session, role-based access control, CSRF protection, audit logs, account recovery controls and stronger monitoring.

TOTP codes normally rotate every 30 seconds. A 47-minute rotation is not a standard secure TOTP interval and makes replay windows much larger. Use a standard authenticator, hardware security key/passkey for creator sign-in, and short-lived sessions. No system is guaranteed “hack-proof.”

## Before real launch
- Replace demo ticket prices and event information.
- Add a database and inventory reservations/locks.
- Save Stripe connected account IDs server-side, associated with authenticated organisers.
- Add idempotent webhook processing and create unique ticket records only after verified payment.
- Implement QR token generation, one-time scan validation and offline entry strategy.
- Add refunds, cancellations, customer support, data retention and privacy notices.
- Configure production HTTPS, environment secrets, backups, monitoring and security review.
- Confirm UK tax, consumer, data-protection and payment-provider requirements for the operating model.
