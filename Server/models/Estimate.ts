import { Schema, model, Document, Types } from 'mongoose';

/**
 * IEstimateItem represents a line on an estimate.  It is similar to
 * invoice items but stored separately to allow different defaults and
 * status values.
 */
export interface IEstimateItem {
  product: Types.ObjectId;
  description?: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
  tax?: number;
  lineTotal: number;
}

/**
 * Estimate represents a quote provided to a customer before converting to
 * an invoice.  Estimates may be accepted, converted to an invoice or
 * expire after a set date.  A depositReceived field allows capturing
 * advance payments.
 */
export interface IEstimate extends Document {
  store?: Types.ObjectId;
  estimateNumber: string;
  customer?: Types.ObjectId;
  salesRep?: Types.ObjectId;
  date?: Date;
  expirationDate?: Date;
  status: 'draft' | 'pending' | 'accepted' | 'converted' | 'expired';
  items: IEstimateItem[];
  subtotal: number;
  discountTotal?: number;
  taxTotal?: number;
  total: number;
  depositReceived?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EstimateItemSchema = new Schema<IEstimateItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discountPercent: { type: Number },
  tax: { type: Number },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const EstimateSchema = new Schema<IEstimate>({
  store: { type: Schema.Types.ObjectId, ref: 'Store' },
  estimateNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  salesRep: { type: Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  expirationDate: { type: Date },
  status: { type: String, enum: ['draft','pending','accepted','converted','expired'], default: 'draft' },
  items: { type: [EstimateItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, required: true },
  depositReceived: { type: Number, default: 0 },
  notes: { type: String },
}, { timestamps: true });

export default model<IEstimate>('Estimate', EstimateSchema);