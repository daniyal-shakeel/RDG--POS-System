import express from "express";
import { createCustomer, getCustomers, getCustomerById, updateCustomer, deleteCustomer } from "../controllers/Customer";
import { authenticate } from "../middleware/auth";

const customerRouter = express.Router();


customerRouter.use(authenticate);

customerRouter.post("/", createCustomer);
customerRouter.get("/", getCustomers);
customerRouter.get("/:id", getCustomerById);
customerRouter.put("/:id", updateCustomer);
customerRouter.delete("/:id", deleteCustomer);

export default customerRouter;
