import express from "express";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  getInvoiceEdits,
  updateInvoice,
  deleteInvoice,
} from "../controllers/Invoice";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

const invoiceRouter = express.Router();

// All routes require authentication
invoiceRouter.use(authenticate);

invoiceRouter.post("/", requirePermission("invoice.create"), createInvoice);
invoiceRouter.get("/", requirePermission("invoice.view"), getInvoices);
invoiceRouter.get("/:id", requirePermission("invoice.view"), getInvoiceById);
invoiceRouter.get("/:id/edits", requirePermission("invoice.view"), getInvoiceEdits);
invoiceRouter.post("/:id/edits", requirePermission("invoice.update"), updateInvoice);
invoiceRouter.delete("/:id", requirePermission("invoice.delete"), deleteInvoice);

export default invoiceRouter;