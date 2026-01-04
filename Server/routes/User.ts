import express from "express";
import { createUser, getUsers, suspendUser, unsuspendUser } from "../controllers/User";
import { authenticate, authorize } from "../middleware/auth";

const userRouter = express.Router();

// All routes require authentication and super admin role
userRouter.use(authenticate);
userRouter.use(authorize("Super Admin"));

userRouter.post("/", createUser);
userRouter.get("/", getUsers);
userRouter.patch("/:id/suspend", suspendUser);
userRouter.patch("/:id/unsuspend", unsuspendUser);

export default userRouter;

