import express from "express";
import {
  createReceipt,
  getReceipts,
  getReceiptById,
  generateReceiptFromInvoice,
} from "../controllers/Receipt";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

const receiptRouter = express.Router();

// All routes require authentication
receiptRouter.use(authenticate);

receiptRouter.post("/", requirePermission("receipt.create"), createReceipt);
receiptRouter.post("/generate-from-invoice", requirePermission("receipt.create"), generateReceiptFromInvoice);
receiptRouter.get("/", requirePermission("receipt.view"), getReceipts);
receiptRouter.get("/:id", requirePermission("receipt.view"), getReceiptById);

export default receiptRouter;
