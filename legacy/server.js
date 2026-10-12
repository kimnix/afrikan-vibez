require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const Stripe = require("stripe");
const speakeasy = require("speakeasy");
const crypto = require("crypto");

const required = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SESSION_SECRET", "CREATOR_TOTP_SECRET"];
for (const key of required) {
  if (!process.env[key] || process.env[key].includes("REPLACE")) {
    console.warn(`Configuration required: ${key}`);
  }
}

const app = express();
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const EVENT_NAME = process.env.EVENT_NAME || "DL Events";
const CURRENCY = (process.env.CURRENCY || "gbp").toLowerCase();

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.static("public", { index: "index.html" }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }));

// Stripe requires the raw body to verify webhook signatures. This route MUST be
// registered before express.json() or any body parser that consumes the payload.
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(503).send("Payments not configured");
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Invalid webhook signature: ${err.message}`);
  }

  // TODO production: persist the event ID and ticket order in a database with
  // unique constraints; make processing idempotent before issuing tickets.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("Verified paid checkout:", session.id, session.payment_status);
    // Only issue QR tickets after verifying payment_status === "paid".
    // Generate random ticket tokens server-side; never encode personal data in QR.
  }
  res.json({ received: true });
});

app.use(express.json({ limit: "20kb" }));

const checkoutLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false });
app.post("/api/create-checkout-session", checkoutLimiter, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Payments are not configured yet." });

    const { ticketType, quantity, buyerEmail } = req.body || {};
    const prices = {
      standard: 2500,
      group4: 9000,
      vip: 7500,
      exclusive10: 50000
    };
    const labels = {
      standard: "Standard ticket",
      group4: "Group of 4",
      vip: "VIP ticket",
      exclusive10: "Exclusive package for 10"
    };

    if (!Object.hasOwn(prices, ticketType)) return res.status(400).json({ error: "Choose a valid ticket package." });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return res.status(400).json({ error: "Quantity must be between 1 and 10." });
    if (buyerEmail && (typeof buyerEmail !== "string" || buyerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail))) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    // Price IDs are fixed on the server; never trust a price sent by the browser.
    // Quantity applies to packages. For ticket-count inventory, reserve stock in a
    // database transaction before creating the session.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: CURRENCY,
          unit_amount: prices[ticketType],
          product_data: { name: labels[ticketType] }
        },
        quantity
      }],
      customer_email: buyerEmail || undefined,
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/?checkout=cancelled`,
      metadata: { eventName: EVENT_NAME, ticketType, quantity: String(quantity) }
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout creation failed:", err.message);
    res.status(500).json({ error: "Unable to start checkout. Try again." });
  }
});

// Stripe Connect Express onboarding: the organiser enters payout/bank details
// on Stripe-hosted pages. This application never receives or stores bank details.
app.post("/api/connect/onboarding-link", checkoutLimiter, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Payments are not configured yet." });

    // In production, require authenticated organiser identity here and load its
    // connectedAccountId from your database. Never accept an arbitrary account ID
    // from the browser. This demo intentionally creates a new connected account.
    const account = await stripe.accounts.create({
      type: "express",
      country: "GB",
      capabilities: { transfers: { requested: true } }
    });
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${BASE_URL}/organiser.html?refresh=1`,
      return_url: `${BASE_URL}/organiser.html?return=1`,
      type: "account_onboarding"
    });
    // Demo only: returns account ID for local testing. Persist it securely in a
    // real database linked to an authenticated organiser, not localStorage.
    res.json({ url: link.url, accountId: account.id });
  } catch (err) {
    console.error("Connect onboarding failed:", err.message);
    res.status(500).json({ error: "Unable to start secure payout setup." });
  }
});

// Creator-only action protected by TOTP (authenticator app) and rate limiting.
// A real production admin route must ALSO require a proper login/session, role
// checks, CSRF protection, and audit logging. TOTP is an additional factor.
const creatorLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false });
app.post("/api/creator/verify", creatorLimiter, (req, res) => {
  const { code } = req.body || {};
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return res.status(400).json({ ok: false, error: "Enter the 6-digit authenticator code." });
  const ok = speakeasy.totp.verify({
    secret: process.env.CREATOR_TOTP_SECRET || "",
    encoding: "base32",
    token: code,
    window: 1
  });
  if (!ok) return res.status(401).json({ ok: false, error: "Code invalid or expired." });
  // Verification only: this demo does not create an admin session or expose admin data.
  res.json({ ok: true, message: "Authenticator code verified. Production admin login/session is still required." });
});

app.get("/api/config", (req, res) => {
  res.json({ eventName: EVENT_NAME, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "" });
});

app.listen(PORT, () => console.log(`DL ticketing starter running at ${BASE_URL}`));
