import mongoose, {Document} from "mongoose";

interface InvoiceItem {
    product_id: mongoose.Types.ObjectId;
    quantity: number;
    unit_price: number;
}

interface Payment {
    amount: number;
    payment_date: Date;
    payment_method?: string;
    notes?: string;
}

interface Invoice extends Document {
    invoiceReference: string; // INV-YYYY-XXXX
    estimate_id?: mongoose.Types.ObjectId; // Reference to the estimate (optional)
    customer_id: mongoose.Types.ObjectId;
    items: InvoiceItem[];
    subtotal: number;
    tax_type?: 'percentage' | 'fixed';
    tax_value?: number;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    total: number;
    balance: number; // Amount remaining to be paid
    total_paid: number; // Total amount paid so far
    due_payment: number; // Amount due (remaining balance)
    deposit_received: number; // Deposit amount received
    payments: Payment[]; // Array of payment records
    status: 'Pending' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Cancelled';
    paymentTerms: string;
    due_date: Date;
    notes?: string;
    signature?: string; // Base64 encoded signature image
    sales_rep_id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const invoiceItemSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0.01
    },
    unit_price: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    invoiceReference: {
        type: String,
        unique: true,
        trim: true
    },
    estimate_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Estimate',
        required: false
    },
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    items: {
        type: [invoiceItemSchema],
        required: true,
        validate: {
            validator: (items: InvoiceItem[]) => items.length > 0,
            message: 'At least one item is required'
        }
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    tax_type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: undefined
    },
    tax_value: {
        type: Number,
        min: 0,
        default: undefined
    },
    discount_type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: undefined
    },
    discount_value: {
        type: Number,
        min: 0,
        default: undefined
    },
    total: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    balance: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    total_paid: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    due_payment: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    deposit_received: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    payments: {
        type: [{
            amount: {
                type: Number,
                required: true,
                min: 0.01
            },
            payment_date: {
                type: Date,
                required: true,
                default: Date.now
            },
            payment_method: {
                type: String,
                default: ''
            },
            notes: {
                type: String,
                default: ''
            }
        }],
        default: []
    },
    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'],
        default: 'Pending'
    },
    paymentTerms: {
        type: String,
        required: true,
        default: 'Net 30'
    },
    due_date: {
        type: Date,
        required: true
    },
    notes: {
        type: String,
        default: ''
    },
    signature: {
        type: String,
        default: undefined
    },
    sales_rep_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
}, {
    timestamps: true
});

// Helper function to calculate totals
const calculateTotals = function(this: Invoice) {
    // Calculate subtotal from items
    this.subtotal = this.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
    }, 0);

    // Apply discount
    let discountAmount = 0;
    if (this.discount_type && this.discount_value !== undefined) {
        if (this.discount_type === 'percentage') {
            discountAmount = (this.subtotal * this.discount_value) / 100;
        } else {
            discountAmount = this.discount_value;
        }
    }

    // Calculate amount after discount
    const amountAfterDiscount = this.subtotal - discountAmount;

    // Apply tax
    let taxAmount = 0;
    if (this.tax_type && this.tax_value !== undefined) {
        if (this.tax_type === 'percentage') {
            taxAmount = (amountAfterDiscount * this.tax_value) / 100;
        } else {
            taxAmount = this.tax_value;
        }
    }

    // Calculate total
    this.total = amountAfterDiscount + taxAmount;
    
    // Ensure total is not negative
    if (this.total < 0) {
        this.total = 0;
    }

    // Balance equals total initially (no payments made yet)
    if (this.isNew || this.balance === undefined) {
        this.balance = this.total;
    }

    // Calculate total_paid from payments array and deposit
    const depositAmount = this.deposit_received || 0;
    if (this.payments && Array.isArray(this.payments)) {
        this.total_paid = this.payments.reduce((sum, payment) => sum + payment.amount, 0) + depositAmount;
    } else {
        this.total_paid = depositAmount;
    }

    // Calculate due_payment (remaining balance after deposit and payments)
    this.due_payment = Math.max(0, this.total - this.total_paid);
    
    // Update balance to match due_payment
    this.balance = this.due_payment;
};

// Pre-save hook to auto-generate invoice reference number (INV-YYYY-XXXX) and calculate totals
invoiceSchema.pre('save', async function(this: Invoice) {
    // Always calculate totals
    calculateTotals.call(this);

    // Only generate reference for new documents that don't already have one
    if (!this.isNew || this.invoiceReference) {
        return;
    }

    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // Get the model from mongoose
    const InvoiceModel = mongoose.models.Invoice || mongoose.model<Invoice>('Invoice', invoiceSchema);
    
    // Find the invoice with the highest reference number for this year
    const lastInvoice = await InvoiceModel.findOne(
        { invoiceReference: new RegExp(`^INV-${currentYear}-`) },
        { invoiceReference: 1 },
        { sort: { invoiceReference: -1 } }
    );

    let nextNumber = 1;
    
    if (lastInvoice && lastInvoice.invoiceReference) {
        // Extract the number from the last invoice reference (e.g., "INV-2026-5320" -> 5320)
        const match = lastInvoice.invoiceReference.match(/^INV-\d{4}-(\d+)$/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    // Generate the new invoice reference (INV-YYYY-XXXX)
    this.invoiceReference = `INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    
    // Calculate totals for new invoice
    calculateTotals.call(this);
});

const Invoice = mongoose.model<Invoice>("Invoice", invoiceSchema);

export {Invoice, InvoiceItem, Payment};