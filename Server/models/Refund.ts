import { Schema, model, Document, Types } from 'mongoose';

/**
 * Refund tracks the return of funds to a customer.  It can reference a
 * sale, invoice or credit note and carries its own status and payment method.
 */
export interface IRefund extends Document {
  store?: Types.ObjectId;
  refundNumber: string;
  customer?: Types.ObjectId;
  sale?: Types.ObjectId;
  invoice?: Types.ObjectId;
  creditNote?: Types.ObjectId;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  method: 'cash' | 'card' | 'storeCredit';
  amount: number;
  reason?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>({
  store: { type: Schema.Types.ObjectId, ref: 'Store' },
  refundNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  sale: { type: Schema.Types.ObjectId, ref: 'Sale' },
  invoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  creditNote: { type: Schema.Types.ObjectId, ref: 'CreditNote' },
  status: { type: String, enum: ['pending','approved','paid','rejected'], default: 'pending' },
  method: { type: String, enum: ['cash','card','storeCredit'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
}, { timestamps: true });

export default model<IRefund>('Refund', RefundSchema);