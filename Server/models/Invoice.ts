import { Schema, model, Document, Types } from 'mongoose';

/**
 * IInvoiceItem represents a single line on an invoice.  It stores the
 * reference to a product and captures pricing, discounts and tax for the
 * line.  This is embedded within the Invoice document.
 */
export interface IInvoiceItem {
  product: Types.ObjectId;
  description?: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
  tax?: number;
  lineTotal: number;
}

/**
 * Invoice documents customer orders.  It aggregates one or more items
 * and tracks totals, status and payment state.  Payment information
 * such as deposit or partial payments can be stored separately.
 */
export interface IInvoice extends Document {
  store?: Types.ObjectId;
  register?: Types.ObjectId;
  invoiceNumber: string;
  customer?: Types.ObjectId;
  salesRep?: Types.ObjectId;
  date?: Date;
  dueDate?: Date;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'void';
  items: IInvoiceItem[];
  subtotal: number;
  discountTotal?: number;
  taxTotal?: number;
  total: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  createdBy?: Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discountPercent: { type: Number },
  tax: { type: Number },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
  store: { type: Schema.Types.ObjectId, ref: 'Store' },
  register: { type: Schema.Types.ObjectId, ref: 'Register' },
  invoiceNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  salesRep: { type: Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date },
  status: { type: String, enum: ['draft','pending','partial','paid','void'], default: 'draft' },
  items: { type: [InvoiceItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['unpaid','partial','paid'], default: 'unpaid' },
  notes: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
}, { timestamps: true });

export default model<IInvoice>('Invoice', InvoiceSchema);