import { Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { validateData, ValidationError, customerSchema, validateMongoId } from '../utils/validation';
import mongoose from 'mongoose';

export const createCustomer = async (req: Request, res: Response) => {
    try {
        // Validate and sanitize input data
        const validatedData = validateData(customerSchema, req.body);
        
        // Business logic: check if customer already exists
        const existingCustomer = await Customer.findOne({ customerEmail: validatedData.customerEmail });
        if (existingCustomer) {
            return res.status(400).json({ message: 'Customer already exists' });
        }
        
        // Business logic: create new customer
        const newCustomer = new Customer(validatedData);
        await newCustomer.save();
        
        return res.status(201).json({ 
            message: 'Customer created successfully', 
            customer: newCustomer 
        });
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.errors
            });
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({ 
            message: 'Error creating customer', 
            error: errorMessage
        });
    }
}
export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        
        // Validate MongoDB ObjectId format
        try {
            validateMongoId(id);
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            throw error;
        }
        
        // check if customer exists
        const customer = await Customer.findById(id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        // delete customer
        await customer.deleteOne();
        return res.status(200).json({ message: 'Customer deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Error deleting customer', error });
    }
}
export const updateCustomer = async (req: Request, res: Response) => {
    try {
        let { id } = req.params;
        
        // Validate MongoDB ObjectId format
        let objectId: mongoose.Types.ObjectId;
        try {
            validateMongoId(id);
            objectId = new mongoose.Types.ObjectId(id);
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            throw error;
        }
        
        // Validate update data
        const validatedData = validateData(customerSchema, req.body);
        
        // check if customer exists
        const customer = await Customer.findById(objectId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        // update customer
        await customer.updateOne(validatedData);
        return res.status(200).json({ message: 'Customer updated successfully' });
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.errors
            });
        }
        return res.status(500).json({ message: 'Error updating customer', error });
    }
}
export const getCustomers = async (req: Request, res: Response) => {
    try {
        const customers = await Customer.find().limit(10);
        return res.status(200).json({ message: 'Customers fetched successfully', customers, length: customers.length });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching customers', error });
    }
}

export const getCustomerById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // Validate MongoDB ObjectId format
        try {
            validateMongoId(id);
        } catch (error) {
            if (error instanceof ValidationError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            throw error;
        }
        
        // check if customer exists
        const customer = await Customer.findById(id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        return res.status(200).json({ message: 'Customer fetched successfully', customer });

        // Invoice model -> invoice_id -> customer_id -> customer
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching customer', error });
    }
}