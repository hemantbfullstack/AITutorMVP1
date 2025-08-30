import React from 'react';
import { Crown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store/userStore';
import { getPlanById } from '@/lib/planUtils';

const UsageIndicator: React.FC = () => {
  const { user, isUsageLimitReached, getRemainingCredits } = useUserStore();
  
  console.log('UsageIndicator: user from store:', user); // Debug log
  
  if (!user) {
    console.log('UsageIndicator: No user, not rendering'); // Debug log
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
        <div className="flex items-center justify-center">
          <span className="text-sm text-yellow-700">
            Loading user information...
          </span>
        </div>
      </div>
    );
  }
  
  const currentPlan = getPlanById(user.planId);
  if (!currentPlan) {
    console.log('UsageIndicator: No plan found for user:', user.planId); // Debug log
    return (
      <div className="bg-red-50 border-b border-red-200 px-6 py-3">
        <div className="flex items-center justify-center">
          <span className="text-sm text-red-700">
            Invalid plan configuration
          </span>
        </div>
      </div>
    );
  }
  
  const remainingCredits = getRemainingCredits();
  const isLimitReached = isUsageLimitReached();
  
  console.log('UsageIndicator: Rendering with plan:', currentPlan, 'remaining:', remainingCredits); // Debug log
  
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              {currentPlan.name} Plan
            </span>
          </div>
          
          {currentPlan.limit && (
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isLimitReached ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ 
                    width: `${Math.min((user.usageCount / currentPlan.limit) * 100, 100)}%` 
                  }}
                />
              </div>
              <span className={`text-xs ${isLimitReached ? 'text-red-600' : 'text-gray-500'}`}>
                {remainingCredits} of {currentPlan.limit} questions remaining
              </span>
            </div>
          )}
        </div>
        
        {isLimitReached && (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <Button
              onClick={() => window.location.href = '/pricing'}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
            >
              Upgrade Plan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageIndicator;
