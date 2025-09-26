import { plans } from "@shared/constants";
import express, { Request, Response } from "express";
import Stripe from "stripe";

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
    const allPlans = [...plans];

    for (const plan of allPlans) {
      // Skip free plans (Stripe doesn't handle $0 recurring plans well)
      if (plan.price === 0) {
        updatedPlans.push(plan);
        continue;
      }

      let stripePriceId = plan.stripePriceId;

      // If no Stripe price yet, create Product + Price
      if (!stripePriceId) {
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: {
            planId: plan.id,
            includesImages: plan.includesImages ? "true" : "false",
            includesVoice: plan.includesVoice ? "true" : "false",
            imageLimit: plan.imageLimit?.toString() || "unlimited",
            groupAccess: plan.groupAccess?.toString() || "1",
            prioritySupport: plan.prioritySupport ? "true" : "false",
            paperGeneration: plan.paperGeneration?.toString() || "0"
          }
        });

        const price = await stripe.prices.create({
          unit_amount: plan.price * 100, // paise (INR cents)
          currency: plan.currency.toLowerCase(),
          recurring: {
            interval: convertIntervalToStripe(plan.interval),
          },
          product: product.id,
          metadata: {
            planId: plan.id
          }
        });

        stripePriceId = price.id;
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
    const allPlans = [...plans];
    
    // First, let's check if we need to sync plans
    const needsSync = allPlans.some(plan => 
      plan.price > 0 && !plan.stripePriceId
    );

    if (needsSync) {
      // Auto-sync plans if they don't have stripePriceId
      const updatedPlans: typeof allPlans = [];

      for (const plan of allPlans) {
        if (plan.price === 0) {
          updatedPlans.push(plan);
          continue;
        }

        let stripePriceId = plan.stripePriceId;

        if (!stripePriceId) {
          try {
            const product = await stripe.products.create({
              name: plan.name,
              description: plan.description,
              metadata: {
                planId: plan.id,
                includesImages: plan.includesImages ? "true" : "false",
                includesVoice: plan.includesVoice ? "true" : "false",
                imageLimit: plan.imageLimit?.toString() || "unlimited",
                groupAccess: plan.groupAccess?.toString() || "1",
                prioritySupport: plan.prioritySupport ? "true" : "false",
                paperGeneration: plan.paperGeneration?.toString() || "0"
              }
            });

            const price = await stripe.prices.create({
              unit_amount: plan.price * 100,
              currency: plan.currency.toLowerCase(),
              recurring: {
                interval: convertIntervalToStripe(plan.interval),
              },
              product: product.id,
              metadata: {
                planId: plan.id
              }
            });

            stripePriceId = price.id;
          } catch (error) {
            console.error(`Failed to create Stripe price for ${plan.name}:`, error);
          }
        }

        updatedPlans.push({ ...plan, stripePriceId });
      }

      res.json({ success: true, plans: updatedPlans });
    } else {
      // Return existing plans if they already have stripePriceId
      res.json({ success: true, plans: allPlans });
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
      console.log("Payment successful for session:", session.id);
      // TODO: Implement user subscription activation in database
      // This would typically involve:
      // 1. Finding the user by email or customer ID
      // 2. Updating their plan in the database
      // 3. Setting subscription status to active
      break;
    case "invoice.payment_failed":
      const invoice = event.data.object as Stripe.Invoice;
      console.log("Payment failed for invoice:", invoice.id);
      // TODO: Implement payment failure handling
      // This would typically involve:
      // 1. Finding the user by customer ID
      // 2. Updating their subscription status
      // 3. Sending notification email
      break;
    case "customer.subscription.updated":
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Subscription updated:", subscription.id);
      // TODO: Implement subscription update handling
      break;
    case "customer.subscription.deleted":
      const deletedSubscription = event.data.object as Stripe.Subscription;
      console.log("Subscription cancelled:", deletedSubscription.id);
      // TODO: Implement subscription cancellation handling
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

export default router;