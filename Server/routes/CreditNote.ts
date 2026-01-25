import express from "express";
import {
  createCreditNote,
  getCreditNotes,
  getCreditNoteById,
  updateCreditNote,
} from "../controllers/CreditNote";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

const creditNoteRouter = express.Router();

// All routes require authentication
creditNoteRouter.use(authenticate);

creditNoteRouter.post("/", requirePermission("creditNote.create"), createCreditNote);
creditNoteRouter.get("/", requirePermission("creditNote.view"), getCreditNotes);
creditNoteRouter.get("/:id", requirePermission("creditNote.view"), getCreditNoteById);
creditNoteRouter.put("/:id", requirePermission("creditNote.update"), updateCreditNote);

export default creditNoteRouter;
