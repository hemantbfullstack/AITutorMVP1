export interface StripePlan {
  id: string;
  name: string;
  limit: number | null;
  interval: string;
  price: number;
  currency: string;
  features: string[];
  description: string;
  stripePriceId?: string;
  popular?: boolean;
  badge?: string;
}

export interface CreateCheckoutSessionRequest {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutSessionResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export interface PlansResponse {
  success: boolean;
  plans: StripePlan[];
  error?: string;
}

// Fetch available plans from the backend
export async function fetchPlans(): Promise<StripePlan[]> {
  try {
    const response = await fetch('/api/stripe/plans');
    const data: PlansResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch plans');
    }
    
    return data.plans;
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    throw new Error(error.message || 'Failed to fetch plans');
  }
}

// Create a Stripe checkout session
export async function createCheckoutSession(
  request: CreateCheckoutSessionRequest
): Promise<string> {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data: CreateCheckoutSessionResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }
    
    if (!data.url) {
      throw new Error('No checkout URL received');
    }
    
    return data.url;
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw new Error(error.message || 'Failed to create checkout session');
  }
}

// Sync plans with Stripe (admin function)
export async function syncPlans(): Promise<StripePlan[]> {
  try {
    const response = await fetch('/api/stripe/sync-plans', {
      method: 'POST',
    });
    
    const data: PlansResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to sync plans');
    }
    
    return data.plans;
  } catch (error: any) {
    console.error('Error syncing plans:', error);
    throw new Error(error.message || 'Failed to sync plans');
  }
}
