const functions = require("firebase-functions/v1");
const express = require("express");
const app = express();
const cors = require("cors");

const secretKey = process.env.NEXT_PUBLIC_stripe_liveSk;

const stripe = require("stripe")(secretKey);

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

app.post("/create-customer", async (req, res) => {
  try {
    const { email, name, firebaseId } = req.body;

    console.log("Stripe customer creation request:", req.body);

    // Check if a customer with the provided email already exists in Stripe
    const existingCustomers = await stripe.customers.list({
      email: email,
    });

    if (existingCustomers.data.length > 0) {
      // Use the first existing customer found
      const existingCustomer = existingCustomers.data[0];

      res.status(200).json({ customerId: existingCustomer.id });
    } else {
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: email,
        name: name,
        description: "RAGESTATE",
        metadata: {
          firebaseId: firebaseId,
        },
      });

      console.log("Stripe customer creation response:", customer);

      res.status(200).json({ customerId: customer.id });
    }
  } catch (error) {
    console.error("Error creating customer:", error);
    console.error("Stripe API response:", error);
    res.status(500).json({
      error: "An error occurred while creating the customer.",
      details: error.message,
    });
  }
});

app.post("/payment-sheet", async (req, res) => {
  try {
    const { amount, customerEmail, name, firebaseId, addressDetails } =
      req.body;

    let customer;

    // Check if the customer already exists
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
    });

    if (existingCustomers.data.length > 0) {
      // Use the first existing customer found
      customer = existingCustomers.data[0];
    } else {
      // Create a new customer if no existing customer is found
      customer = await stripe.customers.create({
        name: name,
        email: customerEmail,
        description: name,
        metadata: {
          firebaseId,
        },
      });
    }

    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2022-11-15" }
    );

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      customer: customer.id,
      description: "Thanks for RAGING with us.",
      receipt_email: customerEmail,
      shipping: addressDetails,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        purchaseDetails:
          "Cross Reference PaymentIntent ID with Firestore purchase document ID",
      },
    });

    // Return response
    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey:
        "pk_live_51NFhuOHnXmOBmfaDu16tJEuppfYKPUivMapB9XLXaBpiOLqiPRz2uoPAiifxqiLT49dyPCHOSKs74wjBspzJ8zo600yGYluqUe",
    });
  } catch (error) {
    console.error("Error creating payment sheet:", error);
    console.error("Stripe API response:", error);
    res.status(500).json({
      error: "An error occurred while creating the payment sheet.",
      details: error.message,
    });
  }
});

// Endpoint to retrieve a customer by ID
app.get("/retrieve-customer/:customerId", async (req, res) => {
  try {
    const customerId = req.params.customerId;

    // Retrieve the customer from Stripe
    const customer = await stripe.customers.retrieve(customerId);

    // Send the customer data back to the client
    res.json(customer);
  } catch (error) {
    console.error("Error retrieving customer:", error);
    console.error("Stripe API response:", error);
    res.status(500).json({
      error: "An error occurred while retrieving the customer.",
      details: error.message,
    });
  }
});

app.post("/create-payment-intent", async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "usd",
      amount: 1999,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    res.send({ client_secret: paymentIntent.client_secret });
  } catch (e) {
    console.error("Error creating payment intent:", e);
    console.error("Stripe API response:", e);
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.post("/web-payment", async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { amount, customerEmail, name, firebaseId } = req.body;

  try {
    let customer;

    // Check if the customer already exists
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
    });

    if (existingCustomers.data.length > 0) {
      // Use the first existing customer found
      customer = existingCustomers.data[0];
    } else {
      // Create a new customer if no existing customer is found
      customer = await stripe.customers.create({
        name: name,
        email: customerEmail,
        description: name,
        metadata: {
          firebaseId,
        },
      });
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      customer: customer.id,
      description: "Payment for your order",
      receipt_email: customerEmail,
      metadata: {
        firebaseId,
      },
    });
    res.status(200).json({ client_secret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    console.error("Stripe API response:", error);
    res.status(500).json({
      error: "An error occurred while creating the payment intent.",
      details: error.message,
    });
  }
});

exports.stripePayment = functions.https.onRequest(app);
