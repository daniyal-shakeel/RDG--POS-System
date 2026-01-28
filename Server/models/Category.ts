import { Schema, model, Document, Types } from 'mongoose';

/**
 * Category groups products into logical sections.  A category may have a
 * parentCategory to support nested trees.
 */
export interface ICategory extends Document {
  name: string;
  parentCategory?: Types.ObjectId;
  sortOrder?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
  sortOrder: { type: Number },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default model<ICategory>('Category', CategorySchema);