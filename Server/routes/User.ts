import express from "express";
import { createUser, getUsers, suspendUser, unsuspendUser } from "../controllers/User";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { hasPermission, requirePermission } from "../middleware/permissions";

const userRouter = express.Router();


userRouter.use(authenticate);


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


userRouter.post("/", authorize("Super Admin"), createUser);


userRouter.patch("/:id/suspend", authorize("Super Admin"), suspendUser);


userRouter.patch("/:id/unsuspend", authorize("Super Admin"), unsuspendUser);

export default userRouter;

