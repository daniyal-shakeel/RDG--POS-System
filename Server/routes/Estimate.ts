import express from "express";
import {
  createEstimate,
  getEstimates,
  getEstimateByReference,
  updateEstimate,
  deleteEstimate,
  updateEstimateStatus,
} from "../controllers/Estimate";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

const estimateRouter = express.Router();

// All routes require authentication
estimateRouter.use(authenticate);

estimateRouter.post("/save", requirePermission("estimate.create"), createEstimate);
estimateRouter.get("/", requirePermission("estimate.view"), getEstimates);
estimateRouter.get("/:reference", requirePermission("estimate.view"), getEstimateByReference);
estimateRouter.put("/:reference", requirePermission("estimate.update"), updateEstimate);
estimateRouter.delete("/:id", requirePermission("estimate.delete"), deleteEstimate);
estimateRouter.patch("/:id/status", requirePermission("estimate.update"), updateEstimateStatus);

export default estimateRouter;

