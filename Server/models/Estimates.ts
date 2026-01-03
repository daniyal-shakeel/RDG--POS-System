import mongoose, {Document} from "mongoose";

interface EstimateItem {
    product_id: mongoose.Types.ObjectId;
    quantity: number;
    unit_price: number;
}

interface Estimate extends Document {
    estimateReference: string; // EST-YYYY-XXXX
    customer_id: mongoose.Types.ObjectId;
    items: EstimateItem[];
    subtotal: number;
    tax_type?: 'percentage' | 'fixed';
    tax_value?: number;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    total: number;
    balance: string; // N/A for estimates
    status: 'Draft' | 'Pending' | 'Accepted' | 'Rejected' | 'Expired';
    valid_until: Date;
    notes?: string;
    sales_rep_id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const estimateItemSchema = new mongoose.Schema({
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

const estimateSchema = new mongoose.Schema({
    estimateReference: {
        type: String,
        unique: true,
        trim: true
    },
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    items: {
        type: [estimateItemSchema],
        required: true,
        validate: {
            validator: (items: EstimateItem[]) => items.length > 0,
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
        type: String,
        default: 'N/A'
    },
    status: {
        type: String,
        enum: ['Draft', 'Pending', 'Accepted', 'Rejected', 'Expired'],
        default: 'Draft'
    },
    valid_until: {
        type: Date,
        required: true
    },
    notes: {
        type: String,
        default: ''
    },
    sales_rep_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
}, {
    timestamps: true
});

// Helper function to calculate totals
const calculateTotals = function(this: Estimate) {
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
};

// Pre-save hook to auto-generate estimate reference number (EST-YYYY-XXXX)
estimateSchema.pre('save', async function(this: Estimate) {
    // Always calculate totals (for both new and existing documents)
    calculateTotals.call(this);

    // Only generate reference for new documents that don't already have one
    if (!this.isNew || this.estimateReference) {
        return;
    }

    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // Get the model from mongoose
    const EstimateModel = mongoose.models.Estimate || mongoose.model<Estimate>('Estimate', estimateSchema);
    
    // Find the estimate with the highest reference number for this year
    const lastEstimate = await EstimateModel.findOne(
        { estimateReference: new RegExp(`^EST-${currentYear}-`) },
        { estimateReference: 1 },
        { sort: { estimateReference: -1 } }
    );

    let nextNumber = 1;
    
    if (lastEstimate && lastEstimate.estimateReference) {
        // Extract the number from the last estimate reference (e.g., "EST-2026-5320" -> 5320)
        const match = lastEstimate.estimateReference.match(/^EST-\d{4}-(\d+)$/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    // Generate the new estimate reference (EST-YYYY-XXXX)
    this.estimateReference = `EST-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    
    // Calculate totals for new estimate
    calculateTotals.call(this);
});

const Estimate = mongoose.model<Estimate>("Estimate", estimateSchema);

export {Estimate, EstimateItem};
