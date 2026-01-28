import { Schema, model, Document } from 'mongoose';

/**
 * Role defines a set of permissions that can be assigned to users.  permissionKeys is an array of
 * strings describing allowed actions (for example invoice.create).
 */
export interface IRole extends Document {
  name: string;
  permissionKeys: string[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true },
  permissionKeys: { type: [String], default: [] },
  isSystemRole: { type: Boolean, default: false },
}, { timestamps: true });

export default model<IRole>('Role', RoleSchema);