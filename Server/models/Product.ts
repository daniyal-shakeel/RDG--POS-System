import { Schema, model, Document, Types } from 'mongoose';

/**
 * Product represents a sellable item.  It references a category and may
 * optionally refer to a tax profile.  Products can be marked as active
 * or archived to remove them from catalog listings without deletion.
 */
export interface IProduct extends Document {
  name: string;
  sku: string;
  barcode?: string;
  category: Types.ObjectId;
  description?: string;
  images?: string[];
  unit?: string;
  trackInventory: boolean;
  allowBackorder: boolean;
  costPrice: number;
  salePrice: number;
  taxProfile?: Types.ObjectId;
  discountable: boolean;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  barcode: { type: String },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  description: { type: String },
  images: { type: [String], default: [] },
  unit: { type: String },
  trackInventory: { type: Boolean, default: true },
  allowBackorder: { type: Boolean, default: false },
  costPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  taxProfile: { type: Schema.Types.ObjectId, ref: 'TaxProfile' },
  discountable: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

export default model<IProduct>('Product', ProductSchema);