import mongoose, {Document} from "mongoose";

interface ReceiptItem {
    product_id: mongoose.Types.ObjectId;
    quantity: number;
    unit_price: number;
    discount_percentage?: number; // Optional discount percentage per item
}

interface Receipt extends Document {
    receiptReference: string; // RCP-YYYY-XXXX
    invoice_id?: mongoose.Types.ObjectId; // Reference to the invoice (optional)
    customer_id: mongoose.Types.ObjectId;
    items: ReceiptItem[];
    subtotal: number;
    tax_type?: 'percentage' | 'fixed';
    tax_value?: number; // VAT value
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    total: number;
    deposit_received: number; // Deposit amount received
    balance_due: number; // Balance due (can be negative if overpaid)
    billing_address: string;
    shipping_address: string;
    notes?: string; // Message/notes
    signature?: string; // Base64 encoded signature image
    sales_rep_id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const receiptItemSchema = new mongoose.Schema({
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
    },
    discount_percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    }
}, { _id: false });

const receiptSchema = new mongoose.Schema({
    receiptReference: {
        type: String,
        unique: true,
        trim: true
    },
    invoice_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: false
    },
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    items: {
        type: [receiptItemSchema],
        required: true,
        validate: {
            validator: (items: ReceiptItem[]) => items.length > 0,
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
    deposit_received: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    balance_due: {
        type: Number,
        required: true,
        default: 0
    },
    billing_address: {
        type: String,
        required: true
    },
    shipping_address: {
        type: String,
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
const calculateTotals = function(this: Receipt) {
    // Calculate subtotal from items (with item-level discounts)
    this.subtotal = this.items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unit_price;
        const itemDiscount = item.discount_percentage 
            ? (itemTotal * item.discount_percentage) / 100 
            : 0;
        return sum + (itemTotal - itemDiscount);
    }, 0);

    // Apply document-level discount
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

    // Apply tax (VAT)
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

    // Calculate balance due (total - deposit, can be negative if overpaid)
    this.balance_due = this.total - (this.deposit_received || 0);
};

// Pre-save hook to auto-generate receipt reference number (RCP-YYYY-XXXX) and calculate totals
receiptSchema.pre('save', async function(this: Receipt) {
    // Always calculate totals
    calculateTotals.call(this);

    // Only generate reference for new documents that don't already have one
    if (!this.isNew || this.receiptReference) {
        return;
    }

    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // Get the model from mongoose
    const ReceiptModel = mongoose.models.Receipt || mongoose.model<Receipt>('Receipt', receiptSchema);
    
    // Find the receipt with the highest reference number for this year
    const lastReceipt = await ReceiptModel.findOne(
        { receiptReference: new RegExp(`^RCP-${currentYear}-`) },
        { receiptReference: 1 },
        { sort: { receiptReference: -1 } }
    );

    let nextNumber = 1;
    
    if (lastReceipt && lastReceipt.receiptReference) {
        // Extract the number from the last receipt reference (e.g., "RCP-2026-1199" -> 1199)
        const match = lastReceipt.receiptReference.match(/^RCP-\d{4}-(\d+)$/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    // Generate the new receipt reference (RCP-YYYY-XXXX)
    this.receiptReference = `RCP-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    
    // Calculate totals for new receipt
    calculateTotals.call(this);
});

const Receipt = mongoose.model<Receipt>("Receipt", receiptSchema);

export {Receipt, ReceiptItem};
