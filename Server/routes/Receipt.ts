import express from "express";
import { createReceipt, deleteReceipt, updateReceipt, getReceipts, getReceiptById } from "../controllers/Receipt";

const receiptRouter = express.Router();

receiptRouter.post('/', createReceipt);
receiptRouter.get('/', getReceipts);
receiptRouter.get('/:id', getReceiptById);
receiptRouter.put('/:id', updateReceipt);
receiptRouter.delete('/:id', deleteReceipt);

export default receiptRouter;

