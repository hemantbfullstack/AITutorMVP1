import express from "express";
import { requireAdmin } from "../middleware/roleAuth";
import { db, getPoolStatus } from "../db";
import {
  users,
  tutorSessions,
  messages,
  generatedPapers,
} from "../../shared/schema";
import { eq, sql, desc, asc, like, and, or, count } from "drizzle-orm";

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin as any);

// Advanced user listing with filters, search, sort, and pagination
// Replace your current users route with this further optimized version
router.get("/users", async (req, res) => {
  try {
    const startTime = Date.now();

    // Log pool status before query
    const poolStatusBefore = getPoolStatus();
    console.log(" Pool status before query:", poolStatusBefore);

    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      plan = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      status = "all",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    let whereConditions = [];

    if (search) {
      whereConditions.push(
        or(
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    if (role && role !== "all") {
      whereConditions.push(eq(users.role, role as string));
    }

    if (plan && plan !== "all") {
      whereConditions.push(eq(users.planId, plan as string));
    }

    if (status === "active") {
      whereConditions.push(sql`${users.usageCount} < 1000`);
    } else if (status === "inactive") {
      whereConditions.push(sql`${users.usageCount} >= 1000`);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // PHASE 1: Get users quickly (no stats yet)
    const queryStart = Date.now();
    const allUsers = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(
        sortBy === "firstName"
          ? sortOrder === "asc"
            ? asc(users.firstName)
            : desc(users.firstName)
          : sortBy === "lastName"
          ? sortOrder === "asc"
            ? asc(users.lastName)
            : desc(users.lastName)
          : sortBy === "email"
          ? sortOrder === "asc"
            ? asc(users.email)
            : desc(users.email)
          : sortBy === "role"
          ? sortOrder === "asc"
            ? asc(users.role)
            : desc(users.role)
          : sortBy === "planId"
          ? sortOrder === "asc"
            ? asc(users.planId)
            : desc(users.planId)
          : sortBy === "usageCount"
          ? sortOrder === "asc"
            ? asc(users.usageCount)
            : desc(users.usageCount)
          : sortOrder === "asc"
          ? asc(users.createdAt)
          : desc(users.createdAt)
      )
      .limit(limitNum)
      .offset(offset);

    const queryTime = Date.now() - queryStart;
    console.log(`📊 Users query took ${queryTime}ms`);

    // PHASE 2: OPTIMIZED stats queries - Use EXISTS instead of COUNT
    const statsStart = Date.now();
    const userIds = allUsers.map((user) => user.id);

    let usersWithStats = allUsers;
    if (userIds.length > 0) {
      // OPTION 1: Use EXISTS queries (much faster than COUNT)
      const statsPromises = userIds.map(async (userId) => {
        const [hasSessions, hasMessages, hasPapers] = await Promise.all([
          db.select({
            exists: sql<boolean>`EXISTS(SELECT 1 FROM ${tutorSessions} WHERE ${tutorSessions.userId} = ${userId})`,
          }),
          db.select({
            exists: sql<boolean>`EXISTS(SELECT 1 FROM ${messages} WHERE ${messages.userId} = ${userId})`,
          }),
          db.select({
            exists: sql<boolean>`EXISTS(SELECT 1 FROM ${generatedPapers} WHERE ${generatedPapers.userId} = ${userId})`,
          }),
        ]);

        return {
          userId,
          sessions: hasSessions[0]?.exists ? 1 : 0, // Simplified: just check if exists
          messages: hasMessages[0]?.exists ? 1 : 0, // Simplified: just check if exists
          papers: hasPapers[0]?.exists ? 1 : 0, // Simplified: just check if exists
        };
      });

      const statsResults = await Promise.all(statsPromises);

      // Create lookup map
      const statsMap = new Map(statsResults.map((s) => [s.userId, s]));

      // Combine users with stats
      usersWithStats = allUsers.map((user) => ({
        ...user,
        stats: {
          sessions: statsMap.get(user.id)?.sessions || 0,
          messages: statsMap.get(user.id)?.messages || 0,
          papers: statsMap.get(user.id)?.papers || 0,
        },
      }));
    } else {
      // No users, add empty stats
      usersWithStats = allUsers.map((user) => ({
        ...user,
        stats: { sessions: 0, messages: 0, papers: 0 },
      }));
    }

    const statsTime = Date.now() - statsStart;
    console.log(` Stats queries took ${statsTime}ms`);

    // PHASE 3: Get total count and filter options
    const metaStart = Date.now();
    const [totalCountResult, roles, plans] = await Promise.all([
      db.select({ count: count() }).from(users).where(whereClause),
      db.select({ role: users.role }).from(users).groupBy(users.role),
      db.select({ role: users.planId }).from(users).groupBy(users.planId),
    ]);

    const totalCount = totalCountResult[0].count;
    const metaTime = Date.now() - metaStart;
    console.log(`🔍 Meta queries took ${metaTime}ms`);

    const totalDuration = Date.now() - startTime;

    // Log detailed performance breakdown
    console.log(`⏱️ Performance Breakdown:
      - Users query: ${queryTime}ms
      - Stats queries: ${statsTime}ms  
      - Meta queries: ${metaTime}ms
      - Total API time: ${totalDuration}ms
    `);

    // Log pool status after query
    const poolStatusAfter = getPoolStatus();
    console.log("🔍 Pool status after query:", poolStatusAfter);

    res.json({
      users: usersWithStats,
      duration: totalDuration,
      performance: {
        queryTime,
        statsTime,
        metaTime,
        totalTime: totalDuration,
      },
      poolStatus: poolStatusAfter,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum < Math.ceil(totalCount / limitNum),
        hasPrev: pageNum > 1,
      },
      filters: {
        roles: roles.map((r) => r.role),
        plans: plans.map((r) => r.role),
        statuses: ["all", "active", "inactive"],
      },
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user statistics
router.get("/users/stats", async (req, res) => {
  try {
    const [totalUsers, activeUsers, newUsersThisMonth, premiumUsers] =
      await Promise.all([
        db.select({ count: count() }).from(users),
        db
          .select({ count: count() })
          .from(users)
          .where(sql`${users.usageCount} > 0`),
        db
          .select({ count: count() })
          .from(users)
          .where(sql`${users.createdAt} >= NOW() - INTERVAL '1 month'`),
        db
          .select({ count: count() })
          .from(users)
          .where(sql`${users.planId} IN ('monthly', 'annual')`),
      ]);

    const roleDistribution = await db
      .select({ role: users.role, count: count() })
      .from(users)
      .groupBy(users.role);

    const planDistribution = await db
      .select({ plan: users.planId, count: count() })
      .from(users)
      .groupBy(users.planId);

    res.json({
      overview: {
        totalUsers: totalUsers[0].count,
        activeUsers: activeUsers[0].count,
        newUsersThisMonth: newUsersThisMonth[0].count,
        premiumUsers: premiumUsers[0].count,
      },
      roleDistribution,
      planDistribution,
    });
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

// Update user role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id));

    res.json({ message: "User role updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// Update user plan
router.patch("/users/:id/plan", async (req, res) => {
  try {
    const { id } = req.params;
    const { planId } = req.body;

    if (!["free", "hourly", "monthly", "annual"].includes(planId)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    await db
      .update(users)
      .set({ planId, updatedAt: new Date() })
      .where(eq(users.id, id));

    res.json({ message: "User plan updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user plan" });
  }
});

// Reset user usage
router.patch("/users/:id/reset-usage", async (req, res) => {
  try {
    const { id } = req.params;

    await db
      .update(users)
      .set({
        usageCount: 0,
        usageResetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    res.json({ message: "User usage reset successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset user usage" });
  }
});

// Delete user (admin only)
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(users).where(eq(users.id, id));
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Get system statistics
router.get("/stats", async (req, res) => {
  try {
    const [userCount, sessionCount, messageCount, paperCount] =
      await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(tutorSessions),
        db.select({ count: count() }).from(messages),
        db.select({ count: count() }).from(generatedPapers),
      ]);

    res.json({
      totalUsers: userCount[0].count,
      totalSessions: sessionCount[0].count,
      totalMessages: messageCount[0].count,
      totalPapers: paperCount[0].count,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

export default router;
