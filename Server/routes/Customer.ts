import express from "express";
import { createCustomer, deleteCustomer, updateCustomer, getCustomers, getCustomerById } from "../controllers/Customer";

const customerRouter = express.Router();

customerRouter.post('/', createCustomer);
customerRouter.get('/', getCustomers);
customerRouter.get('/:id', getCustomerById);
customerRouter.put('/:id', updateCustomer);
customerRouter.delete('/:id', deleteCustomer);

export default customerRouter;