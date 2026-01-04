import { Schema, model, Document, Types } from 'mongoose';

/**
 * Device holds configuration and status information for hardware used by the
 * POS system, such as barcode scanners or receipt printers.
 */
export interface IDevice extends Document {
  name: string;
  type: 'scanner' | 'printer' | 'other';
  status: 'connected' | 'disconnected' | 'error';
  meta?: any;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>({
  name: { type: String, required: true },
  type: { type: String, enum: ['scanner', 'printer', 'other'], required: true },
  status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
  meta: { type: Schema.Types.Mixed },
}, { timestamps: true });

export default model<IDevice>('Device', DeviceSchema);