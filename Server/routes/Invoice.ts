import express from "express";
import { createInvoice, deleteInvoice, updateInvoice, getInvoice } from "../controllers/Invoice";

const invoiceRouter = express.Router();

invoiceRouter.post('/', createInvoice);
invoiceRouter.get('/', getInvoice);
invoiceRouter.put('/:id', updateInvoice);
invoiceRouter.delete('/:id', deleteInvoice);

export default invoiceRouter;

