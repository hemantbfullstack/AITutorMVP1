import { plans } from "@shared/constants";
import express, { Request, Response } from "express";

const router = express.Router();

// Only initialize Stripe if API key is provided
let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {});
  } catch (error) {
    console.warn("Stripe not available:", error);
  }
}

// Helper function to convert our interval to Stripe's supported intervals
const convertIntervalToStripe = (interval: string): "day" | "week" | "month" | "year" => {
  switch (interval) {
    case "daily":
      return "day";
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    case "yearly":
      return "year";
    default:
      return "month"; // Default fallback
  }
};

// Sync plans to Stripe
router.post("/sync-plans", async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ 
      success: false, 
      error: "Stripe not configured. Please add STRIPE_SECRET_KEY to secrets." 
    });
  }
  
  try {
    const updatedPlans: typeof plans = [];

    for (const plan of plans) {
      // Skip free/lifetime (Stripe doesn't handle $0 recurring plans well)
      if (plan.price === 0 || plan.interval === "lifetime") {
        updatedPlans.push(plan);
        continue;
      }

      let stripePriceId = plan.stripePriceId;

      // If no Stripe price yet, create Product + Price
      if (!stripePriceId) {
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
        });

        const price = await stripe.prices.create({
          unit_amount: plan.price * 100, // cents
          currency: plan.currency.toLowerCase(),
          recurring: {
            interval: convertIntervalToStripe(plan.interval),
          },
          product: product.id,
        });

        stripePriceId = price.id;
        console.log(`Created Stripe price for ${plan.name}: ${stripePriceId}`);
      }

      // Merge stripePriceId into plan
      updatedPlans.push({ ...plan, stripePriceId });
    }

    res.json({ success: true, plans: updatedPlans });
  } catch (error: any) {
    console.error("Sync plans error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📋 List synced plans (for React frontend) - This should return plans with stripePriceId
router.get("/plans", async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ 
      success: false, 
      error: "Stripe not configured. Please add STRIPE_SECRET_KEY to secrets." 
    });
  }
  
  try {
    // First, let's check if we need to sync plans
    const needsSync = plans.some(plan => 
      plan.price > 0 && plan.interval !== "lifetime" && !plan.stripePriceId
    );

    if (needsSync) {
      // Auto-sync plans if they don't have stripePriceId
      const updatedPlans: typeof plans = [];

      for (const plan of plans) {
        if (plan.price === 0 || plan.interval === "lifetime") {
          updatedPlans.push(plan);
          continue;
        }

        let stripePriceId = plan.stripePriceId;

        if (!stripePriceId) {
          try {
            const product = await stripe.products.create({
              name: plan.name,
              description: plan.description,
            });

            const price = await stripe.prices.create({
              unit_amount: plan.price * 100,
              currency: plan.currency.toLowerCase(),
              recurring: {
                interval: convertIntervalToStripe(plan.interval),
              },
              product: product.id,
            });

            stripePriceId = price.id;
            console.log(`Auto-created Stripe price for ${plan.name}: ${stripePriceId}`);
          } catch (error) {
            console.error(`Failed to create Stripe price for ${plan.name}:`, error);
          }
        }

        updatedPlans.push({ ...plan, stripePriceId });
      }

      res.json({ success: true, plans: updatedPlans });
    } else {
      // Return existing plans if they already have stripePriceId
      res.json({ success: true, plans });
    }
  } catch (error: any) {
    console.error("Get plans error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📋 List products/prices directly from Stripe
router.get("/stripe/products", async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ 
      success: false, 
      error: "Stripe not configured. Please add STRIPE_SECRET_KEY to secrets." 
    });
  }
  
  try {
    const products = await stripe.products.list({ limit: 50 });
    const prices = await stripe.prices.list({ limit: 50 });
    res.json({ success: true, products, prices });
  } catch (error: any) {
    console.error("List products error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 💳 Create Checkout Session
router.post("/create-checkout-session", async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ 
      success: false, 
      error: "Stripe not configured. Please add STRIPE_SECRET_KEY to secrets." 
    });
  }
  
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId) {
      return res.status(400).json({ success: false, error: "Missing priceId" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || "http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl || "http://localhost:3000/cancel",
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error("Checkout session error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ⚡ Stripe Webhook (handle success/fail)
router.post("/webhook", express.raw({ type: "application/json" }), (req: any, res: any) => {
  if (!stripe) {
    return res.status(503).json({ 
      success: false, 
      error: "Stripe not configured. Please add STRIPE_SECRET_KEY to secrets." 
    });
  }
  
  const sig = req.headers["stripe-signature"];
  let event: any;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event types
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("✅ Payment succeeded for session:", session.id);
      // TODO: Mark user subscription active in DB
      break;
    case "invoice.payment_failed":
      console.log("❌ Payment failed:", event.data.object);
      // TODO: Handle subscription failed
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

export default router;