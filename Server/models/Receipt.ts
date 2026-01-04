import { Schema, model, Document, Types } from 'mongoose';

/**
 * IReceiptItem models a line on a receipt (after a sale is completed).
 */
export interface IReceiptItem {
  product: Types.ObjectId;
  description?: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
  tax?: number;
  lineTotal: number;
}

/**
 * Receipt records the final sale, typically generated after payment is
 * received.  It references the related sale or invoice if present and
 * holds line items, totals and deposit/balance information.
 */
export interface IReceipt extends Document {
  store?: Types.ObjectId;
  receiptNumber: string;
  sale?: Types.ObjectId;
  invoice?: Types.ObjectId;
  customer?: Types.ObjectId;
  date?: Date;
  items: IReceiptItem[];
  subtotal: number;
  discountTotal?: number;
  taxTotal?: number;
  total: number;
  deposit?: number;
  balanceDue?: number;
  message?: string;
  signature?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptItemSchema = new Schema<IReceiptItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discountPercent: { type: Number },
  tax: { type: Number },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const ReceiptSchema = new Schema<IReceipt>({
  store: { type: Schema.Types.ObjectId, ref: 'Store' },
  receiptNumber: { type: String, required: true, unique: true },
  sale: { type: Schema.Types.ObjectId, ref: 'Sale' },
  invoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  date: { type: Date, default: Date.now },
  items: { type: [ReceiptItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, required: true },
  deposit: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  message: { type: String },
  signature: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default model<IReceipt>('Receipt', ReceiptSchema);