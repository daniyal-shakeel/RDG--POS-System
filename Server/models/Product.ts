import mongoose, {Document} from "mongoose";

interface PricingInventory {
    selling_price: number;
    cost_price: number;
    current_stock: number;
    minimum_stock_alert: number;
}

interface PriceSummary {
    selling_price: number;
    cost_price: number;
    profit_margin: number;
}

interface Product extends Document {
    product_code: string;
    barcode?: string;
    product_name: string;
    category: string;
    description: string;
    pricing_inventory: PricingInventory;
    price_summary?: PriceSummary;
    stock_status?: 'in stock' | 'low stock' | 'out of stock';
    createdAt?: Date;
    updatedAt?: Date;
}

const pricingInventorySchema = new mongoose.Schema({
    selling_price: {
        type: Number,
        required: true,
        min: 0
    },
    cost_price: {
        type: Number,
        required: true,
        min: 0
    },
    current_stock: {
        type: Number,
        required: true,
        min: 0
    },
    minimum_stock_alert: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const priceSummarySchema = new mongoose.Schema({
    selling_price: {
        type: Number,
        required: true,
        min: 0
    },
    cost_price: {
        type: Number,
        required: true,
        min: 0
    },
    profit_margin: {
        type: Number,
        required: true
    }
}, { _id: false });

const productSchema = new mongoose.Schema({
    product_code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    barcode: {
        type: String,
        unique: true,
        trim: true
    },
    product_name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    pricing_inventory: {
        type: pricingInventorySchema,
        required: true
    },
    price_summary: {
        type: priceSummarySchema,
        required: false
    },
    stock_status: {
        type: String,
        enum: ['in stock', 'low stock', 'out of stock'],
        default: 'in stock'
    }
}, {
    timestamps: true
});

// Helper function to calculate stock status
const calculateStockStatus = (currentStock: number, minimumStockAlert: number): 'in stock' | 'low stock' | 'out of stock' => {
    if (currentStock === 0) {
        return 'out of stock';
    } else if (currentStock <= minimumStockAlert) {
        return 'low stock';
    } else {
        return 'in stock';
    }
};

// Pre-save hook to calculate profit_margin in price_summary and stock_status
productSchema.pre('save', function(this: Product) {
    if (this.pricing_inventory) {
        // Always calculate price_summary from pricing_inventory
        if (!this.price_summary) {
            this.price_summary = {
                selling_price: 0,
                cost_price: 0,
                profit_margin: 0
            };
        }
        this.price_summary.selling_price = this.pricing_inventory.selling_price;
        this.price_summary.cost_price = this.pricing_inventory.cost_price;
        this.price_summary.profit_margin = this.pricing_inventory.selling_price - this.pricing_inventory.cost_price;
        
        // Calculate stock_status based on current_stock and minimum_stock_alert
        this.stock_status = calculateStockStatus(
            this.pricing_inventory.current_stock,
            this.pricing_inventory.minimum_stock_alert
        );
    }
});

const Product = mongoose.model<Product>("Product", productSchema);

export {Product, PricingInventory, PriceSummary};

