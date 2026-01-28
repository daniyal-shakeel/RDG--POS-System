import express from "express";
import {
  createRefund,
  getRefunds,
  getRefundById,
  updateRefund,
} from "../controllers/Refund";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

const refundRouter = express.Router();

// All routes require authentication
refundRouter.use(authenticate);

refundRouter.post("/", requirePermission("refund.create"), createRefund);
refundRouter.get("/", requirePermission("refund.view"), getRefunds);
refundRouter.get("/:id", requirePermission("refund.view"), getRefundById);
refundRouter.put("/:id", requirePermission("refund.update"), updateRefund);

export default refundRouter;
