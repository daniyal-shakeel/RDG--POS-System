import { Schema, model, Document } from 'mongoose';





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