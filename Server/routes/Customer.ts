import express from "express";
import { createCustomer, deleteCustomer, updateCustomer, getCustomers, getCustomerById } from "../controllers/Customer";

const customerRouter = express.Router();

customerRouter.post('/', createCustomer); // /api/v1/customer/ post // create a new customer
customerRouter.get('/', getCustomers); // /api/v1/customer/ get // get all customers
customerRouter.get('/:id', getCustomerById); // /api/v1/customer/:id get // get a customer by id
customerRouter.put('/:id', updateCustomer); // /api/v1/customer/:id put // update a customer by id
customerRouter.delete('/:id', deleteCustomer); // /api/v1/customer/:id delete // delete a customer by id

export default customerRouter;  