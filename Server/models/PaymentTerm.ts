import { Schema, model, Document } from 'mongoose';




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