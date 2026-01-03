import mongoose, {Document} from "mongoose";

interface Invoice extends Document {
   customerName: string;
   saleRep: string;
   productId: Array<string>;
   paymentTerms: string;
}

const invoiceSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true
    },
    saleRep: {
        type: String,
        required: true
    },
    productId: {
        type: [String],
        required: true
    },
    paymentTerms: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Invoice = mongoose.model<Invoice>("Invoice", invoiceSchema);

export {Invoice};