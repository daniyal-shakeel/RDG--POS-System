import { Schema, model, Document, Types } from 'mongoose';

/**
 * Store represents a physical or virtual location where sales occur.  A store
 * may have its own address and contact info.
 */
export interface IStore extends Document {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default model<IStore>('Store', StoreSchema);