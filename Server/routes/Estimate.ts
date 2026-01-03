import express from "express";
import { createEstimate, deleteEstimate, updateEstimate, getEstimate } from "../controllers/Estimate";

const estimateRouter = express.Router();

estimateRouter.post('/', createEstimate);
estimateRouter.get('/', getEstimate);
estimateRouter.put('/:id', updateEstimate);
estimateRouter.delete('/:id', deleteEstimate);

export default estimateRouter;