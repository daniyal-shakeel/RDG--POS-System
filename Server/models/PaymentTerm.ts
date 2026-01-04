import { Schema, model, Document } from 'mongoose';

/**
 * PaymentTerm defines standard terms such as Net 15, Net 30 etc.
 */
export interface IPaymentTerm extends Document {
  name: string;
  days: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTermSchema = new Schema<IPaymentTerm>({
  name: { type: String, required: true },
  days: { type: Number, required: true },
}, { timestamps: true });

export default model<IPaymentTerm>('PaymentTerm', PaymentTermSchema);