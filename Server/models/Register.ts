import { Schema, model, Document, Types } from 'mongoose';

/**
 * Register represents a point of sale terminal within a store.  Each
 * register can be configured with a device type, tax profile and receipt
 * template.  Registers may be deactivated.
 */
export interface IRegister extends Document {
  store: Types.ObjectId;
  name: string;
  registerCode: string;
  deviceType?: string;
  defaultTaxProfile?: Types.ObjectId;
  receiptTemplate?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RegisterSchema = new Schema<IRegister>({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  registerCode: { type: String, required: true },
  deviceType: { type: String },
  defaultTaxProfile: { type: Schema.Types.ObjectId, ref: 'TaxProfile' },
  receiptTemplate: { type: Schema.Types.ObjectId },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default model<IRegister>('Register', RegisterSchema);