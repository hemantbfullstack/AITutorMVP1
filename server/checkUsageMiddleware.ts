// server/middleware/checkUsage.ts
import { Plan, plans } from "@shared/constants";
import { Request, Response, NextFunction } from "express";
import { User } from "./models";




interface AuthenticatedRequest extends Request {
  user?: any;
}

export const checkUsage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: "Unauthorized" });

    // Fetch the actual user document from database
    const user = await User.findById(userInfo.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const plan: Plan | undefined = plans.find((p) => p.id === user.planId);
    if (!plan) return res.status(400).json({ error: "Invalid plan" });

    // Reset usage if interval passed
    if (plan.interval !== "lifetime" && user.usageResetAt) {
      const now = new Date();
      if (user.usageResetAt < now) {
        user.usageCount = 0;
        user.usageResetAt = getNextReset(plan.interval);
        await user.save();
      }
    }

    if (plan.limit !== null && user.usageCount >= plan.limit) {
      return res
        .status(403)
        .json({ error: "Limit reached. Please upgrade plan." });
    }

    // Increment usage
    user.usageCount += 1;
    if (!user.usageResetAt) {
      user.usageResetAt = getNextReset(plan.interval);
    }
    await user.save();

    // Update the user info in the request for consistency
    req.user = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      planId: user.planId,
      profileImageUrl: user.profileImageUrl,
      usageCount: user.usageCount,
    };

    // Return updated usage count for client sync
    res.locals.updatedUsageCount = user.usageCount;

    next();
  } catch (err) {
    console.error("checkUsage error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

function getNextReset(interval: string): Date | null {
  const now = new Date();
  switch (interval) {
    case "hourly":
      now.setHours(now.getHours() + 1);
      return now;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      return now;
    case "yearly":
      now.setFullYear(now.getFullYear() + 1);
      return now;
    default:
      return null; // lifetime has no reset
  }
}
