// Frontend plan constants - should match server/shared/constants.ts
export interface Plan {
  id: string;
  name: string;
  limit: number | null;
  interval: "daily" | "monthly" | "yearly" | "lifetime";
  price: number;
  currency: string;
  features: string[];
  description: string;
  stripePriceId?: string;
  popular?: boolean;
  badge?: string;
  imageLimit?: number | null;
  includesVoice?: boolean;
  includesImages?: boolean;
  groupAccess?: number;
  prioritySupport?: boolean;
  paperGeneration?: number | null;
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free Plan (Trial)",
    limit: 75,
    interval: "monthly",
    price: 0,
    currency: "INR",
    features: [
      "10 questions per month",
      "Text + Voice responses",
      "Basic AI tutor access",
      "Standard response time"
    ],
    description: "Perfect for trying out our AI tutor - text and voice only",
    includesVoice: true,
    includesImages: false,
    imageLimit: 0,
    groupAccess: 1,
    prioritySupport: false,
    paperGeneration: 0
  },
  {
    id: "basic",
    name: "Basic Plan",
    limit: 100,
    interval: "monthly",
    price: 299,
    currency: "INR",
    features: [
      "100 questions per month",
      "Text + Voice responses",
      "Fast AI responses",
      "All math tools included",
      "Graph plotting & calculations"
    ],
    description: "Great for regular learners - text and voice only",
    includesVoice: true,
    includesImages: false,
    imageLimit: 0,
    groupAccess: 1,
    prioritySupport: false,
    paperGeneration: 5
  },
  {
    id: "standard",
    name: "Standard Plan",
    limit: 300,
    interval: "monthly",
    price: 799,
    currency: "INR",
    features: [
      "300 questions per month",
      "Text + Voice + Images",
      "30 images per month",
      "Priority AI responses",
      "All math tools included",
      "Advanced graphing capabilities",
      "Paper generation (10/month)",
      "Email support"
    ],
    description: "Best for students who need diagrams and graphs",
    popular: true,
    badge: "Most Popular",
    includesVoice: true,
    includesImages: true,
    imageLimit: 30,
    groupAccess: 1,
    prioritySupport: false,
    paperGeneration: 10
  },
  {
    id: "pro",
    name: "Pro Plan",
    limit: 1000,
    interval: "monthly",
    price: 1999,
    currency: "INR",
    features: [
      "1,000 questions per month",
      "Unlimited images",
      "Text + Voice + Images",
      "Ultra-fast AI responses",
      "All math tools included",
      "Advanced graphing capabilities",
      "Unlimited paper generation",
      "Priority support",
      "Group access for up to 3 students"
    ],
    description: "Perfect for intensive learners and small groups",
    includesVoice: true,
    includesImages: true,
    imageLimit: null, // unlimited
    groupAccess: 3,
    prioritySupport: true,
    paperGeneration: null // unlimited
  },
  {
    id: "institution",
    name: "Institution / School Plan",
    limit: null, // unlimited
    interval: "monthly",
    price: 15000,
    currency: "INR",
    features: [
      "Unlimited questions per student",
      "Unlimited images",
      "Text + Voice + Images",
      "Dashboard for teachers",
      "Usage-based billing",
      "White-label option",
      "Priority support",
      "Group management tools"
    ],
    description: "Custom solutions for schools and institutions",
    includesVoice: true,
    includesImages: true,
    imageLimit: null, // unlimited
    groupAccess: 0, // unlimited
    prioritySupport: true,
    paperGeneration: null // unlimited
  }
];

// Helper functions for credit management
export const getPlanById = (planId: string): Plan | undefined => {
  return plans.find(plan => plan.id === planId);
};

export const getRemainingCredits = (user: { planId: string; usageCount: number }): number => {
  const plan = getPlanById(user.planId);
  if (!plan || !plan.limit) return 0;
  return Math.max(0, plan.limit - user.usageCount);
};

export const isUsageLimitReached = (user: { planId: string; usageCount: number }): boolean => {
  const plan = getPlanById(user.planId);
  if (!plan || !plan.limit) return false;
  return user.usageCount >= plan.limit;
};
