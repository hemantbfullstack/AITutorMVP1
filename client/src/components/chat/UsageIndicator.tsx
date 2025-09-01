import React from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

export const UsageIndicator: React.FC = () => {
  const { user } = useAuth();

  // Simple usage check based on plan
  const isUsageLimitReached = () => {
    if (!user || !user.planId) return false;

    const plans = [
      { id: "free", limit: 5 },
      { id: "hourly", limit: 100 },
      { id: "monthly", limit: 200 },
      { id: "annual", limit: 2500 },
    ];

    const plan = plans.find((p) => p.id === user.planId);
    if (!plan || !plan.limit) return false;

    return user.usageCount >= plan.limit;
  };

  const getRemainingCredits = () => {
    if (!user || !user.planId) return 0;

    const plans = [
      { id: "free", limit: 5 },
      { id: "hourly", limit: 100 },
      { id: "monthly", limit: 200 },
      { id: "annual", limit: 2500 },
    ];

    const plan = plans.find((p) => p.id === user.planId);
    if (!plan || !plan.limit) return 0;

    return Math.max(0, plan.limit - user.usageCount);
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Badge variant={isUsageLimitReached() ? "destructive" : "secondary"}>
        {isUsageLimitReached()
          ? "Limit Reached"
          : `${getRemainingCredits()} credits left`}
      </Badge>
    </div>
  );
};
