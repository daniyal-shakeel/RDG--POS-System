import { z } from 'zod';

/**
 * Preprocesses a string by trimming whitespace and converting empty strings to undefined
 * This handles edge cases like null, undefined, and whitespace-only strings
 */
const preprocessString = (val: unknown): string | undefined => {
    if (val === null || val === undefined) {
        return undefined;
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? undefined : trimmed;
    }
    return String(val).trim() || undefined;
};

/**
 * Validates a required string with trimming and empty checks
 * Handles edge cases: null, undefined, empty strings, whitespace-only strings
 */
export const requiredString = (message?: string) => {
    return z.preprocess(
        preprocessString,
        z.string({
            required_error: message || 'This field is required',
        }).min(1, message || 'This field cannot be empty')
    );
};

/**
 * Validates an optional string with trimming
 * Returns undefined for empty/null/whitespace strings
 */
export const optionalString = () => {
    return z.preprocess(
        preprocessString,
        z.string().optional()
    );
};

/**
 * Validates a required email with trimming and format validation
 */
export const requiredEmail = (message?: string) => {
    return z.preprocess(
        preprocessString,
        z.string({
            required_error: message || 'Email is required',
        })
            .min(1, message || 'Email cannot be empty')
            .email(message || 'Invalid email format')
            .toLowerCase()
    );
};

/**
 * Validates an optional email with trimming and format validation
 */
export const optionalEmail = () => {
    return z.preprocess(
        preprocessString,
        z.string()
            .email('Invalid email format')
            .toLowerCase()
            .optional()
    );
};

/**
 * Validates a required phone number with trimming
 * Allows common phone number formats
 */
export const requiredPhone = (message?: string) => {
    return z.preprocess(
        preprocessString,
        z.string({
            required_error: message || 'Phone number is required',
        })
            .min(1, message || 'Phone number cannot be empty')
            .regex(
                /^[\d\s\-\+\(\)]+$/,
                message || 'Invalid phone number format'
            )
            .min(10, message || 'Phone number must be at least 10 digits')
    );
};

/**
 * Validates an optional phone number with trimming
 */
export const optionalPhone = () => {
    return z.preprocess(
        preprocessString,
        z.string()
            .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')
            .optional()
            .or(z.literal(''))
    );
};

/**
 * Validates a required number with range checks
 */
export const requiredNumber = (min?: number, max?: number, message?: string) => {
    let schema = z.number({
        required_error: message || 'This field is required',
        invalid_type_error: message || 'Must be a number',
    });

    if (min !== undefined) {
        schema = schema.min(min, message || `Must be at least ${min}`);
    }
    if (max !== undefined) {
        schema = schema.max(max, message || `Must be at most ${max}`);
    }

    return z.preprocess((val) => {
        if (val === null || val === undefined || val === '') {
            return undefined;
        }
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    }, schema);
};

/**
 * Validates an optional number with range checks
 */
export const optionalNumber = (min?: number, max?: number) => {
    let schema: z.ZodType<number | undefined> = z.number().optional();

    if (min !== undefined) {
        schema = schema.refine((val) => val === undefined || val >= min, {
            message: `Must be at least ${min}`,
        }) as z.ZodType<number | undefined>;
    }
    if (max !== undefined) {
        schema = schema.refine((val) => val === undefined || val <= max, {
            message: `Must be at most ${max}`,
        }) as z.ZodType<number | undefined>;
    }

    return z.preprocess((val) => {
        if (val === null || val === undefined || val === '') {
            return undefined;
        }
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    }, schema);
};

/**
 * Validates a required array
 */
export const requiredArray = <T extends z.ZodTypeAny>(itemSchema: T, message?: string) => {
    return z.array(itemSchema, {
        required_error: message || 'This field is required',
    }).min(1, message || 'At least one item is required');
};

/**
 * Validates an optional array
 */
export const optionalArray = <T extends z.ZodTypeAny>(itemSchema: T) => {
    return z.array(itemSchema).optional();
};

/**
 * Validates a required date
 */
export const requiredDate = (message?: string) => {
    return z.preprocess((val) => {
        if (val === null || val === undefined || val === '') {
            return undefined;
        }
        if (val instanceof Date) {
            return val;
        }
        if (typeof val === 'string' || typeof val === 'number') {
            const date = new Date(val);
            return isNaN(date.getTime()) ? undefined : date;
        }
        return undefined;
    }, z.date({
        required_error: message || 'Date is required',
        invalid_type_error: message || 'Invalid date format',
    }));
};

/**
 * Validates an optional date
 */
export const optionalDate = () => {
    return z.preprocess((val) => {
        if (val === null || val === undefined || val === '') {
            return undefined;
        }
        if (val instanceof Date) {
            return val;
        }
        if (typeof val === 'string' || typeof val === 'number') {
            const date = new Date(val);
            return isNaN(date.getTime()) ? undefined : date;
        }
        return undefined;
    }, z.date().optional());
};

/**
 * Validates and sanitizes data using a Zod schema
 * Returns validated data or throws an error with detailed validation messages
 */
export const validateData = <T extends z.ZodTypeAny>(
    schema: T,
    data: unknown
): z.infer<T> => {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors = error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', formattedErrors);
        }
        throw error;
    }
};

/**
 * Validates data asynchronously and returns a result object
 * Useful when you want to handle validation errors without throwing
 */
export const validateDataSafe = <T extends z.ZodTypeAny>(
    schema: T,
    data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: ValidationErrorDetails[] } => {
    try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors = error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            return { success: false, errors: formattedErrors };
        }
        throw error;
    }
};

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
    public errors: ValidationErrorDetails[];

    constructor(message: string, errors: ValidationErrorDetails[]) {
        super(message);
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

/**
 * Validation error details type
 */
export type ValidationErrorDetails = {
    field: string;
    message: string;
};

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
    id: z.string().min(1, 'ID is required'),
    mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ID format'),
    positiveNumber: requiredNumber(0),
    percentage: requiredNumber(0, 100, 'Percentage must be between 0 and 100'),
    nonEmptyString: requiredString(),
    url: z.string().url('Invalid URL format'),
    uuid: z.string().uuid('Invalid UUID format'),
};

/**
 * Validates MongoDB ObjectId format
 * @param id - The ID to validate
 * @returns true if valid, throws ValidationError if invalid
 */
export const validateMongoId = (id: string): boolean => {
    try {
        commonSchemas.mongoId.parse(id);
        return true;
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new ValidationError('Invalid MongoDB ID format', [
                { field: 'id', message: 'Invalid MongoDB ID format' }
            ]);
        }
        throw error;
    }
};

/**
 * Validates MongoDB ObjectId format (safe version that returns result)
 * @param id - The ID to validate
 * @returns { success: true } if valid, { success: false, error: string } if invalid
 */
export const validateMongoIdSafe = (id: string): { success: true } | { success: false; error: string } => {
    try {
        commonSchemas.mongoId.parse(id);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Invalid MongoDB ID format' };
    }
};

/**
 * Customer validation schema
 */
export const customerSchema = z.object({
    customerName: requiredString('Customer name is required'),
    customerEmail: requiredEmail('Valid email is required'),
    customerPhone: requiredPhone('Valid phone number is required'),
    customerBillingAddress: requiredString('Billing address is required'),
});

/**
 * Estimate item validation schema
 */
const estimateItemSchema = z.object({
    product_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format'),
    quantity: requiredNumber(0.01, undefined, 'Quantity must be greater than 0'),
    unit_price: requiredNumber(0, undefined, 'Unit price must be 0 or greater'),
});

/**
 * Estimate validation schema
 */
export const estimateSchema = z.object({
    customer_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID format'),
    items: requiredArray(estimateItemSchema, 'At least one item is required'),
    tax_type: z.enum(['percentage', 'fixed']).optional(),
    tax_value: optionalNumber(0),
    discount_type: z.enum(['percentage', 'fixed']).optional(),
    discount_value: optionalNumber(0),
    valid_until: requiredDate('Valid until date is required'),
    notes: optionalString(),
    sales_rep_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid sales representative ID format'),
}).refine((data) => {
    // If tax_type is provided, tax_value must be provided
    if (data.tax_type && data.tax_value === undefined) {
        return false;
    }
    return true;
}, {
    message: 'Tax value is required when tax type is specified',
    path: ['tax_value'],
}).refine((data) => {
    // If discount_type is provided, discount_value must be provided
    if (data.discount_type && data.discount_value === undefined) {
        return false;
    }
    return true;
}, {
    message: 'Discount value is required when discount type is specified',
    path: ['discount_value'],
}).refine((data) => {
    // If tax_type is percentage, tax_value should be between 0 and 100
    if (data.tax_type === 'percentage' && data.tax_value !== undefined) {
        return data.tax_value >= 0 && data.tax_value <= 100;
    }
    return true;
}, {
    message: 'Tax percentage must be between 0 and 100',
    path: ['tax_value'],
}).refine((data) => {
    // If discount_type is percentage, discount_value should be between 0 and 100
    if (data.discount_type === 'percentage' && data.discount_value !== undefined) {
        return data.discount_value >= 0 && data.discount_value <= 100;
    }
    return true;
}, {
    message: 'Discount percentage must be between 0 and 100',
    path: ['discount_value'],
});

/**
 * Pricing inventory validation schema
 */
const pricingInventorySchema = z.object({
    selling_price: requiredNumber(0, undefined, 'Selling price must be 0 or greater'),
    cost_price: requiredNumber(0, undefined, 'Cost price must be 0 or greater'),
    current_stock: requiredNumber(0, undefined, 'Current stock must be 0 or greater'),
    minimum_stock_alert: requiredNumber(0, undefined, 'Minimum stock alert must be 0 or greater'),
});

/**
 * Price summary validation schema (optional, will be auto-calculated)
 */
const priceSummarySchema = z.object({
    selling_price: requiredNumber(0, undefined, 'Selling price must be 0 or greater'),
    cost_price: requiredNumber(0, undefined, 'Cost price must be 0 or greater'),
    profit_margin: requiredNumber(undefined, undefined, 'Profit margin is required'),
});

/**
 * Product validation schema
 */
export const productSchema = z.object({
    product_code: requiredString('Product code is required'),
    barcode: optionalString(),
    product_name: requiredString('Product name is required'),
    category: requiredString('Category is required'),
    description: requiredString('Description is required'),
    pricing_inventory: pricingInventorySchema,
    price_summary: priceSummarySchema.optional(),
}).refine((data) => {
    // Ensure selling_price >= cost_price for logical consistency
    if (data.pricing_inventory.selling_price < data.pricing_inventory.cost_price) {
        return false;
    }
    return true;
}, {
    message: 'Selling price should be greater than or equal to cost price',
    path: ['pricing_inventory', 'selling_price'],
});

/**
 * Invoice status update validation schema
 */
export const invoiceStatusSchema = z.object({
    status: z.enum(['Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'], {
        errorMap: () => ({ message: 'Status must be one of: Pending, Paid, Partially Paid, Overdue, Cancelled' })
    }),
    payment_amount: z.number().min(0.01, 'Payment amount must be greater than 0').optional(),
    payment_method: optionalString(),
    payment_notes: optionalString()
}).refine((data) => {
    // If status is Partially Paid, payment_amount is required
    if (data.status === 'Partially Paid' && data.payment_amount === undefined) {
        return false;
    }
    return true;
}, {
    message: 'Payment amount is required when status is Partially Paid',
    path: ['payment_amount'],
});

/**
 * Estimate status update validation schema
 */
export const estimateStatusSchema = z.object({
    status: z.enum(['Draft', 'Pending', 'Accepted', 'Rejected', 'Expired'], {
        errorMap: () => ({ message: 'Status must be one of: Draft, Pending, Accepted, Rejected, Expired' })
    })
});

/**
 * Invoice item validation schema
 */
const invoiceItemSchema = z.object({
    product_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format'),
    quantity: requiredNumber(0.01, undefined, 'Quantity must be greater than 0'),
    unit_price: requiredNumber(0, undefined, 'Unit price must be 0 or greater'),
});

/**
 * Invoice validation schema
 */
export const invoiceSchema = z.object({
    customer_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID format'),
    items: requiredArray(invoiceItemSchema, 'At least one item is required'),
    tax_type: z.enum(['percentage', 'fixed']).optional(),
    tax_value: optionalNumber(0),
    discount_type: z.enum(['percentage', 'fixed']).optional(),
    discount_value: optionalNumber(0),
    paymentTerms: requiredString('Payment terms are required'),
    deposit_received: optionalNumber(0),
    notes: optionalString(),
    signature: optionalString(),
    sales_rep_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid sales representative ID format'),
    estimate_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid estimate ID format').optional(),
}).refine((data) => {
    // If tax_type is provided, tax_value must be provided
    if (data.tax_type && data.tax_value === undefined) {
        return false;
    }
    return true;
}, {
    message: 'Tax value is required when tax type is specified',
    path: ['tax_value'],
}).refine((data) => {
    // If discount_type is provided, discount_value must be provided
    if (data.discount_type && data.discount_value === undefined) {
        return false;
    }
    return true;
}, {
    message: 'Discount value is required when discount type is specified',
    path: ['discount_value'],
}).refine((data) => {
    // If tax_type is percentage, tax_value should be between 0 and 100
    if (data.tax_type === 'percentage' && data.tax_value !== undefined) {
        return data.tax_value >= 0 && data.tax_value <= 100;
    }
    return true;
}, {
    message: 'Tax percentage must be between 0 and 100',
    path: ['tax_value'],
}).refine((data) => {
    // If discount_type is percentage, discount_value should be between 0 and 100
    if (data.discount_type === 'percentage' && data.discount_value !== undefined) {
        return data.discount_value >= 0 && data.discount_value <= 100;
    }
    return true;
}, {
    message: 'Discount percentage must be between 0 and 100',
    path: ['discount_value'],
});

/**
 * Receipt item validation schema
 */
const receiptItemSchema = z.object({
    product_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format'),
    quantity: requiredNumber(0.01, undefined, 'Quantity must be greater than 0'),
    unit_price: requiredNumber(0, undefined, 'Unit price must be 0 or greater'),
    discount_percentage: optionalNumber(0, 100),
});

/**
 * Receipt validation schema
 */
export const receiptSchema = z.object({
    customer_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID format'),
    items: requiredArray(receiptItemSchema, 'At least one item is required'),
    tax_type: z.enum(['percentage', 'fixed']).optional(),
    tax_value: optionalNumber(0),
    discount_type: z.enum(['percentage', 'fixed']).optional(),
    discount_value: optionalNumber(0),
    deposit_received: optionalNumber(0),
    billing_address: requiredString('Billing address is required'),
    shipping_address: requiredString('Shipping address is required'),
    notes: optionalString(),
    signature: optionalString(),
    sales_rep_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid sales representative ID format'),
    invoice_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid invoice ID format').optional(),
}).refine((data) => {
    // If tax_type is provided, tax_value must be provided
    if (data.tax_type && data.tax_value === undefined) {
        return false;
    }
    return true;
}, {
    message: 'Tax value is required when tax type is specified',
    path: ['tax_value'],
}).refine((data) => {
    // If discount_type is provided, discount_value must be provided
    if (data.discount_type && data.discount_value === undefined) {
        return false;
    }
    return true;
}, {
    message: 'Discount value is required when discount type is specified',
    path: ['discount_value'],
}).refine((data) => {
    // If tax_type is percentage, tax_value should be between 0 and 100
    if (data.tax_type === 'percentage' && data.tax_value !== undefined) {
        return data.tax_value >= 0 && data.tax_value <= 100;
    }
    return true;
}, {
    message: 'Tax percentage must be between 0 and 100',
    path: ['tax_value'],
}).refine((data) => {
    // If discount_type is percentage, discount_value should be between 0 and 100
    if (data.discount_type === 'percentage' && data.discount_value !== undefined) {
        return data.discount_value >= 0 && data.discount_value <= 100;
    }
    return true;
}, {
    message: 'Discount percentage must be between 0 and 100',
    path: ['discount_value'],
});

