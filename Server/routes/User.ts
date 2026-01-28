import express from "express";
import { createUser, getUsers, suspendUser, unsuspendUser } from "../controllers/User";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { hasPermission, requirePermission } from "../middleware/permissions";

const userRouter = express.Router();

// All routes require authentication
userRouter.use(authenticate);

// GET /users - requires user.manage, or estimate.create when requesting Sales Representatives
userRouter.get("/", (req: AuthRequest, res, next) => {
  const roleQuery = typeof req.query?.role === "string" ? req.query.role.trim() : "";
  const isSalesRepQuery =
    roleQuery.toLowerCase() === "sales representative" ||
    roleQuery.toLowerCase() === "sales rep";
  if (isSalesRepQuery && req.user) {
    const userPermissions = req.user.permissions || [];
    const hasEstimateCreate = hasPermission(userPermissions, "estimate.create");
    const isStockKeeper = req.user.role === "Stock-Keeper";
    if (hasEstimateCreate || isStockKeeper) {
      return next();
    }
  }
  return requirePermission("user.manage")(req, res, next);
}, getUsers);

// POST /users - requires Super Admin role (only Super Admin can create users)
userRouter.post("/", authorize("Super Admin"), createUser);

// PATCH /users/:id/suspend - requires Super Admin role (only Super Admin can suspend)
userRouter.patch("/:id/suspend", authorize("Super Admin"), suspendUser);

// PATCH /users/:id/unsuspend - requires Super Admin role (only Super Admin can unsuspend)
userRouter.patch("/:id/unsuspend", authorize("Super Admin"), unsuspendUser);

export default userRouter;

