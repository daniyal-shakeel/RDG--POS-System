import { Schema, model, Document, Types } from 'mongoose';






export interface IEstimateItem {
  productCode: string;
  description: string;
  quantity: number;
  discount?: number;
  amount: number;
}







export interface IEstimate extends Document {
  reference: string;
  customerId: Types.ObjectId;
  salesRep: Types.ObjectId;
  status: 'draft' | 'pending' | 'accepted' | 'converted' | 'expired';
  items: IEstimateItem[];
  total: number;
  message?: string;
  signature?: string;
  print?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EstimateItemSchema = new Schema<IEstimateItem>({
  productCode: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  amount: { type: Number, required: true },
}, { _id: false });

const EstimateSchema = new Schema<IEstimate>({
  reference: { type: String, required: true, unique: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRep: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft','pending','accepted','converted','expired'], default: 'draft' },
  items: { type: [EstimateItemSchema], default: [] },
  total: { type: Number, required: true },
  message: { type: String },
  signature: { type: String },
  print: { type: Boolean, default: false },
}, { timestamps: true });

export default model<IEstimate>('Estimate', EstimateSchema);