import mongoose, {Document} from "mongoose";

interface Product extends Document {
    productName: string;
    productCode: string; // sku
    productDescription: string;
    prouductQuantity:number;
    productPrice: number;
    productDiscount: number;
    productMessage: string;
    productSignature: string;
}

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },
    productCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    productDescription: {
        type: String,
        required: true
    },
    prouductQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    productPrice: {
        type: Number,
        required: true,
        min: 0
    },
    productDiscount: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    productMessage: {
        type: String,
        default: ""
    },
    productSignature: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

const Product = mongoose.model<Product>("Product", productSchema);

export {Product};