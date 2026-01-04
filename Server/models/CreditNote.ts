import { Schema, model, Document, Types } from 'mongoose';

/**
 * ICreditNoteItem models a line on a credit note, capturing returned items or
 * adjustments to an invoice.  It parallels invoice items but may have
 * different business logic around quantities and pricing.
 */
export interface ICreditNoteItem {
  product: Types.ObjectId;
  description?: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
  tax?: number;
  lineTotal: number;
}

/**
 * CreditNote represents a credit issued to a customer, often referencing
 * a prior invoice.  It tracks status, totals and the amount of credit
 * remaining to be applied to future invoices or refunds.
 */
export interface ICreditNote extends Document {
  store?: Types.ObjectId;
  creditNoteNumber: string;
  customer?: Types.ObjectId;
  relatedInvoice?: Types.ObjectId;
  status: 'draft' | 'approved' | 'applied' | 'void';
  items: ICreditNoteItem[];
  subtotal: number;
  discountTotal?: number;
  taxTotal?: number;
  total: number;
  amountApplied?: number;
  remainingCredit?: number;
  reason?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CreditNoteItemSchema = new Schema<ICreditNoteItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discountPercent: { type: Number },
  tax: { type: Number },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const CreditNoteSchema = new Schema<ICreditNote>({
  store: { type: Schema.Types.ObjectId, ref: 'Store' },
  creditNoteNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  relatedInvoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  status: { type: String, enum: ['draft','approved','applied','void'], default: 'draft' },
  items: { type: [CreditNoteItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, required: true },
  amountApplied: { type: Number, default: 0 },
  remainingCredit: { type: Number, default: 0 },
  reason: { type: String },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
}, { timestamps: true });

export default model<ICreditNote>('CreditNote', CreditNoteSchema);