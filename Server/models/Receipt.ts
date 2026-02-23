import { Schema, model, Document, Types } from 'mongoose';




export interface IReceiptItem {
  productId: Types.ObjectId;
  productCode: string;
  description?: string;
  quantity: number;
  price: number;
  discount?: number; 
  amount: number; 
}














export interface IReceipt extends Document {
  receiptNumber: string; 
  customerId: Types.ObjectId;
  salesRepId: Types.ObjectId;
  saleType: 'cash' | 'invoice'; 
  invoiceId?: Types.ObjectId; 
  invoiceEditId?: Types.ObjectId; 
  items: IReceiptItem[];
  message?: string;
  signature: string;
  status: 'draft' | 'completed';
  print: boolean; 
  deposit?: number; 
  
  subtotalBeforeDiscount: number; 
  subtotalAfterDiscount: number; 
  tax: number; 
  total: number; 
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptItemSchema = new Schema<IReceiptItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ReceiptSchema = new Schema<IReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    salesRepId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    saleType: {
      type: String,
      enum: ['cash', 'invoice'],
      required: true,
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    invoiceEditId: { type: Schema.Types.ObjectId, ref: 'InvoiceEdit' },
    items: {
      type: [ReceiptItemSchema],
      default: [],
      validate: {
        validator: function(items: IReceiptItem[]) {
          return items && items.length > 0;
        },
        message: 'At least one item is required',
      },
    },
    message: { type: String, trim: true },
    signature: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'completed'],
      default: 'draft',
    },
    print: { type: Boolean, default: false },
    deposit: { type: Number, default: 0, min: 0 },
    subtotalBeforeDiscount: { type: Number, required: true, default: 0, min: 0 },
    subtotalAfterDiscount: { type: Number, required: true, default: 0, min: 0 },
    tax: { type: Number, required: true, default: 0, min: 0 },
    total: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);




ReceiptSchema.index(
  { invoiceId: 1, invoiceEditId: 1 },
  { 
    unique: true, 
    sparse: true, 
    name: 'invoice_edit_unique'
  }
);

export default model<IReceipt>('Receipt', ReceiptSchema);
