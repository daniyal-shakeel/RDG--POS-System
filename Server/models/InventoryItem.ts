import { Schema, model, Document, Types } from 'mongoose';

/**
 * InventoryItem tracks the quantity of a product (or variant) at a specific
 * store.  It also tracks reserved quantities and reorder thresholds.
 */
export interface IInventoryItem extends Document {
  store: Types.ObjectId;
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint?: number;
  reorderQty?: number;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
  quantityOnHand: { type: Number, default: 0 },
  quantityReserved: { type: Number, default: 0 },
  reorderPoint: { type: Number },
  reorderQty: { type: Number },
}, { timestamps: true });

export default model<IInventoryItem>('InventoryItem', InventoryItemSchema);