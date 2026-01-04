import { Schema, model, Document, Types } from 'mongoose';

/**
 * TaxProfile defines a tax rate that can be applied to line items or orders.
 * It supports percentage or fixed amount taxes and may apply to products,
 * shipping or both.  Tax profiles can be toggled on or off.
 */
export interface ITaxProfile extends Document {
  name: string;
  type: 'percentage' | 'fixed';
  rate: number;
  appliesTo: 'products' | 'shipping' | 'all';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaxProfileSchema = new Schema<ITaxProfile>({
  name: { type: String, required: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  rate: { type: Number, required: true },
  appliesTo: { type: String, enum: ['products', 'shipping', 'all'], default: 'products' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default model<ITaxProfile>('TaxProfile', TaxProfileSchema);