import { Schema, model, Document, Types } from 'mongoose';

/**
 * ProductVariant represents a specific variation of a product (e.g. size or
 * color).  Each variant has its own SKU and pricing.  Variants belong to
 * a product.
 */
export interface IProductVariant extends Document {
  product: Types.ObjectId;
  name: string;
  sku: string;
  barcode?: string;
  attributes?: Record<string, any>;
  costPrice: number;
  salePrice: number;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  barcode: { type: String },
  attributes: { type: Schema.Types.Mixed },
  costPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

export default model<IProductVariant>('ProductVariant', ProductVariantSchema);