import mongoose, {Document} from "mongoose";

interface Receipt extends Document {
    invoiceId: string;
    customerName: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    paymentDate: Date;
}

const receiptSchema = new mongoose.Schema({
    invoiceId: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        required: true,
        min: 0
    },
    tax: {
        type: Number,
        required: true,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentDate: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: true
});

const Receipt = mongoose.model<Receipt>("Receipt", receiptSchema);

export {Receipt};