import { Request, Response, NextFunction } from "express";
import { User } from "@shared/schema";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireTeacherOrAdmin = requireRole(["admin", "teacher"]);
export const requireStudentOrTeacherOrAdmin = requireRole([
  "admin",
  "teacher",
  "student",
]);
