"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require("express");
const cors = require("cors");

// Read secret from Functions config: firebase functions:config:set stripe.secret="sk_..."
const stripeSecret =
  process.env.STRIPE_SECRET ||
  (require("firebase-functions").config().stripe &&
    require("firebase-functions").config().stripe.secret);
const stripe = stripeSecret ? require("stripe")(stripeSecret) : null;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, stripeConfigured: Boolean(stripeSecret) });
});

// Example placeholder; add endpoints when Stripe is reactivated
app.post("/create-payment-intent", async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Stripe disabled" });
    const { amount, currency = "usd" } = req.body || {};
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });
    res.json({ client_secret: pi.client_secret });
  } catch (err) {
    logger.error("create-payment-intent error", err);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

exports.stripePayment = onRequest(app);
