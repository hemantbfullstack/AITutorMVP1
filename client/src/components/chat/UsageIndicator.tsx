import React from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getRemainingCredits, isUsageLimitReached } from "@/constants/plans";

export const UsageIndicator: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Badge variant={isUsageLimitReached(user) ? "destructive" : "secondary"}>
        {isUsageLimitReached(user)
          ? "Limit Reached"
          : `${getRemainingCredits(user)} credits left`}
      </Badge>
    </div>
  );
};
