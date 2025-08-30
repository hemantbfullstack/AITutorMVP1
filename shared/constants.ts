export type PlanInterval = "daily" | "monthly" | "yearly" | "lifetime";

export interface Plan {
  id: string;
  name: string;
  limit: number | null;
  interval: PlanInterval;
  price: number;
  currency: string;
  features: string[];
  description: string;
  stripePriceId?: string;
  popular?: boolean;
  badge?: string;
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free Trial",
    limit: 5,
    interval: "lifetime",
    price: 0,
    currency: "USD",
    features: [
      "5 free questions",
      "Basic AI tutor access",
      "Standard response time"
    ],
    description: "Perfect for trying out our AI tutor"
  },
  {
    id: "daily",
    name: "Pay Per Day",
    limit: 100,
    interval: "daily",
    price: 2,
    currency: "USD",
    features: [
      "100 questions per day",
      "Fast AI responses",
      "All math tools included",
      "Graph plotting & calculations"
    ],
    description: "Great for intensive study sessions"
  },
  {
    id: "monthly",
    name: "Monthly Pro",
    limit: 200,
    interval: "monthly",
    price: 19,
    currency: "USD",
    features: [
      "200 questions per month",
      "Priority AI responses",
      "All math tools included",
      "Advanced graphing capabilities",
      "Paper generation (5/month)",
      "Email support"
    ],
    description: "Best for regular learners",
    popular: true,
    badge: "Most Popular"
  },
  {
    id: "annual",
    name: "Annual Pro",
    limit: 2500,
    interval: "yearly",
    price: 199,
    currency: "USD",
    features: [
      "2500 questions per year",
      "Ultra-fast AI responses",
      "All math tools included",
      "Advanced graphing capabilities",
      "Unlimited paper generation",
      "Priority support",
      "Early access to new features"
    ],
    description: "Save 13% with yearly subscription"
  }
];