import { Schema, model, Document, Types } from 'mongoose';

/**
 * IntegrationAccount stores authentication and configuration data for third
 * party integrations such as QuickBooks or MRPEasy.  Each record is
 * associated with a provider.
 */
export interface IIntegrationAccount extends Document {
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  credentials?: any;
  scopes: string[];
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationAccountSchema = new Schema<IIntegrationAccount>({
  provider: { type: String, required: true },
  status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
  credentials: { type: Schema.Types.Mixed },
  scopes: { type: [String], default: [] },
  lastSyncAt: { type: Date },
}, { timestamps: true });

export default model<IIntegrationAccount>('IntegrationAccount', IntegrationAccountSchema);