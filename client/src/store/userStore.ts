import { create } from 'zustand';
import { User } from '../../../shared/schema';

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUsageCount: (count: number) => void;
  resetUsage: () => void;
  isUsageLimitReached: () => boolean;
  getRemainingCredits: () => number;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  
  setUser: (user) => {
    console.log('Setting user in store:', user); // Debug log
    set({ user });
  },
  
  updateUsageCount: (count) => set((state) => ({
    user: state.user ? { ...state.user, usageCount: count } : null
  })),
  
  resetUsage: () => set((state) => ({
    user: state.user ? { ...state.user, usageCount: 0 } : null
  })),
  
  isUsageLimitReached: () => {
    const { user } = get();
    console.log('Checking usage limit for user:', user); // Debug log
    if (!user || !user.planId) return false;
    
    const plan = getPlanById(user.planId);
    if (!plan || !plan.limit) return false;
    
    return user.usageCount >= plan.limit;
  },
  
  getRemainingCredits: () => {
    const { user } = get();
    if (!user || !user.planId) return 0;
    
    const plan = getPlanById(user.planId);
    if (!plan || !plan.limit) return 0;
    
    return Math.max(0, plan.limit - user.usageCount);
  }
}));

// Helper function to get plan by ID
function getPlanById(planId: string) {
  const plans = [
    { id: "free", limit: 5 },
    { id: "hourly", limit: 100 },
    { id: "monthly", limit: 200 },
    { id: "annual", limit: 2500 }
  ];
  return plans.find(plan => plan.id === planId);
}
