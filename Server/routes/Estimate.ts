import express from "express";
import { createEstimate, deleteEstimate, updateEstimate, getEstimate, updateEstimateStatus } from "../controllers/Estimate";

const estimateRouter = express.Router();

estimateRouter.post('/', createEstimate); // create a new estimate
estimateRouter.get('/', getEstimate); 
estimateRouter.put('/:id', updateEstimate);
estimateRouter.patch('/:id/status', updateEstimateStatus);
estimateRouter.delete('/:id', deleteEstimate);

export default estimateRouter;