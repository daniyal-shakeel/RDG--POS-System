import express from "express";
import { createInvoice, deleteInvoice, updateInvoice, getInvoices, getInvoiceById, updateInvoiceStatus } from "../controllers/Invoice";

const invoiceRouter = express.Router();

invoiceRouter.post('/', createInvoice);
invoiceRouter.get('/', getInvoices);
invoiceRouter.get('/:id', getInvoiceById);
invoiceRouter.put('/:id', updateInvoice);
invoiceRouter.patch('/:id/status', updateInvoiceStatus);
invoiceRouter.delete('/:id', deleteInvoice);

export default invoiceRouter;

