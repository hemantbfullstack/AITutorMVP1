import { Plan, plans } from "@shared/constants";

export const getPlanById = (planId: string): Plan | undefined => {
  return plans.find((plan) => plan.id === planId);
};

export const formatUsagePercentage = (
  current: number,
  limit: number
): number => {
  return Math.min((current / limit) * 100, 100);
};

export const getTimeUntilReset = (resetDate: string | null): string => {
  if (!resetDate) return "";

  const now = new Date();
  const reset = new Date(resetDate);
  const diff = reset.getTime() - now.getTime();

  if (diff <= 0) return "Reset now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
