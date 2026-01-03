import express from "express";
import { createReceipt, deleteReceipt, updateReceipt, getReceipt } from "../controllers/Receipt";

const receiptRouter = express.Router();

receiptRouter.post('/', createReceipt);
receiptRouter.get('/', getReceipt);
receiptRouter.put('/:id', updateReceipt);
receiptRouter.delete('/:id', deleteReceipt);

export default receiptRouter;

