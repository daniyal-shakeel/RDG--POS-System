import { Schema, model, Document, Types } from 'mongoose';

/**
 * Settings stores configuration such as company name, tax
 * rate, currency and printing preferences.  Only one settings document
 * typically exists.
 */
export interface ISettings extends Document {
  companyName: string;
  phone?: string;
  address?: string;
  taxRate?: number;
  currency: string;
  autoPrintReceipts: boolean;
  continuousReceiptFormat: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>({
  companyName: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  taxRate: { type: Number },
  currency: { type: String, required: true },
  autoPrintReceipts: { type: Boolean, default: false },
  continuousReceiptFormat: { type: Boolean, default: false },
}, { timestamps: true });

export default model<ISettings>('Settings', SettingsSchema);