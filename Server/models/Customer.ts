import mongoose, {Document} from "mongoose";

interface Customer extends Document {
    customerCode: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerBillingAddress: string;
    customerShippingAddress: string;
}

const customerSchema = new mongoose.Schema({
    customerCode: {
        type: String,
        unique: true,
        trim: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    customerBillingAddress: {
        type: String,
        required: true
    },
    customerShippingAddress: {
        type: String,
    }
}, {
    timestamps: true
});

// Pre-save hook to auto-generate customer code
customerSchema.pre('save', async function(this: Customer) {
    // Only generate code for new documents that don't already have a code
    if (!this.isNew || this.customerCode) {
        return;
    }

    // Get the model from mongoose (will be available after model creation)
    const CustomerModel = mongoose.models.Customer || mongoose.model<Customer>('Customer', customerSchema);
    
    // Find the customer with the highest customer code
    const lastCustomer = await CustomerModel.findOne(
        {},
        { customerCode: 1 },
        { sort: { customerCode: -1 } }
    );

    let nextNumber = 1;
    
    if (lastCustomer && lastCustomer.customerCode) {
        // Extract the number from the last customer code (e.g., "C001" -> 1)
        const match = lastCustomer.customerCode.match(/^C(\d+)$/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    // Generate the new customer code with zero padding (C001, C002, etc.)
    this.customerCode = `C${nextNumber.toString().padStart(3, '0')}`;
});

const Customer = mongoose.model<Customer>("Customer", customerSchema);

export {Customer};