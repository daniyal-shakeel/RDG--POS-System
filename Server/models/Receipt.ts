import { Schema, model, Document, Types } from 'mongoose';

/**
 * Receipt item line - represents a product sold on a receipt
 */
export interface IReceiptItem {
  productId: Types.ObjectId;
  productCode: string;
  description?: string;
  quantity: number;
  price: number;
  discount?: number; // Discount percentage (0-100)
  amount: number; // Calculated: quantity * price * (1 - discount/100)
}

/**
 * Receipt model - records completed sales transactions
 * 
 * Calculations (done at backend):
 * - Amount before discount and tax: sum of (quantity * price) for all items
 * - Amount after discount: sum of item amounts (after applying discounts)
 * - Tax: 12.5% of amount after discount
 * - Total: amount after discount + tax
 * 
 * Status:
 * - draft: Receipt is being created/edited
 * - completed: Receipt is finalized and completed
 */
export interface IReceipt extends Document {
  receiptNumber: string; // Generated at backend (format: RCP-XXXX-XXXX)
  customerId: Types.ObjectId;
  salesRepId: Types.ObjectId;
  saleType: 'cash' | 'invoice'; // Type of sale: cash sale or invoice payment
  invoiceId?: Types.ObjectId; // Reference to invoice if saleType is 'invoice'
  invoiceEditId?: Types.ObjectId; // Reference to invoice edit used to generate this receipt
  items: IReceiptItem[];
  message?: string;
  signature: string;
  status: 'draft' | 'completed';
  print: boolean; // Whether receipt should be printed (true for save and print, false for save draft)
  deposit?: number; // Deposit amount received (for invoice-based receipts)
  // Calculated fields (computed at backend)
  subtotalBeforeDiscount: number; // Sum of quantity * price (before discounts)
  subtotalAfterDiscount: number; // Sum of item amounts (after discounts)
  tax: number; // 12.5% of subtotalAfterDiscount
  total: number; // subtotalAfterDiscount + tax
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

// Compound unique index: One receipt per invoice edit
// This ensures that each invoice edit can only generate one receipt
// The same invoice can have multiple receipts if it has multiple edits
ReceiptSchema.index(
  { invoiceId: 1, invoiceEditId: 1 },
  { 
    unique: true, 
    sparse: true, // Only apply to documents where both fields exist
    name: 'invoice_edit_unique'
  }
);

export default model<IReceipt>('Receipt', ReceiptSchema);
