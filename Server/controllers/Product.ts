import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { validateData, ValidationError, productSchema } from '../utils/validation';

export const createProduct = async (req: Request, res: Response) => {
    try {
        // Validate and sanitize input data
        const validatedData = validateData(productSchema, req.body);

        // Check if product_code already exists
        const existingProductByCode = await Product.findOne({ product_code: validatedData.product_code });
        if (existingProductByCode) {
            return res.status(409).json({
                message: 'Product code already exists',
                errors: [{ field: 'product_code', message: 'A product with this code already exists' }]
            });
        }

        // Check if barcode already exists (if provided)
        if (validatedData.barcode) {
            const existingProductByBarcode = await Product.findOne({ barcode: validatedData.barcode });
            if (existingProductByBarcode) {
                return res.status(409).json({
                    message: 'Barcode already exists',
                    errors: [{ field: 'barcode', message: 'A product with this barcode already exists' }]
                });
            }
        }

        // Prepare product data (price_summary will be auto-calculated by pre-save hook)
        const productData = {
            product_code: validatedData.product_code,
            barcode: validatedData.barcode,
            product_name: validatedData.product_name,
            category: validatedData.category,
            description: validatedData.description,
            pricing_inventory: validatedData.pricing_inventory,
            // price_summary will be auto-calculated in pre-save hook
        };

        // Create new product
        const newProduct = new Product(productData);
        await newProduct.save();

        return res.status(201).json({
            message: 'Product created successfully',
            product: {
                id: newProduct._id,
                product_code: newProduct.product_code,
                barcode: newProduct.barcode,
                product_name: newProduct.product_name,
                category: newProduct.category,
                description: newProduct.description,
                pricing_inventory: newProduct.pricing_inventory,
                price_summary: newProduct.price_summary,
                createdAt: newProduct.createdAt,
                updatedAt: newProduct.updatedAt
            }
        });
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.errors
            });
        }
        
        // Handle duplicate key errors (MongoDB unique constraint)
        if (error instanceof Error && error.name === 'MongoServerError' && (error as any).code === 11000) {
            const duplicateField = Object.keys((error as any).keyPattern)[0];
            return res.status(409).json({
                message: 'Duplicate entry',
                errors: [{ 
                    field: duplicateField, 
                    message: `A product with this ${duplicateField} already exists` 
                }]
            });
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({ 
            message: 'Error creating product', 
            error: errorMessage
        });
    }
}

export const deleteProduct = async (_req: Request, res: Response) => {
    return res.status(200).json({ message: 'Product deleted successfully' });
}

export const updateProduct = async (_req: Request, res: Response) => {
    return res.status(200).json({ message: 'Product updated successfully' });
}

export const getProducts = async (_req: Request, res: Response) => {
    try {
        // Fetch all poduducts
        const products = await Product.find()
            .select('product_name product_code pricing_inventory stock_status')
            .sort({ product_name: 1 });

        // Transform products to return only requested fields
        const productsData = products.map(product => {
            // Ensure stock_status is calculated if not set
            let stockStatus = product.stock_status;
            if (!stockStatus && product.pricing_inventory) {
                const currentStock = product.pricing_inventory.current_stock;
                const minimumStockAlert = product.pricing_inventory.minimum_stock_alert;
                
                if (currentStock === 0) {
                    stockStatus = 'out of stock';
                } else if (currentStock <= minimumStockAlert) {
                    stockStatus = 'low stock';
                } else {
                    stockStatus = 'in stock';
                }
            }

            return {
                product_name: product.product_name,
                product_code: product.product_code,
                price: product.pricing_inventory.selling_price,
                stock: product.pricing_inventory.current_stock,
                stock_status: stockStatus || 'in stock'
            };
        });

        return res.status(200).json({
            message: 'Products fetched successfully',
            products: productsData,
            count: productsData.length
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({
            message: 'Error fetching products',
            error: errorMessage
        });
    }
}

