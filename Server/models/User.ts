import { Schema, model, Document, Types } from 'mongoose';

/**
 * Address subdocument used for user addresses
 */
export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * A user of the POS system.  Users may be assigned multiple roles.  They can optionally be tied to one or more
 * stores.  Passwords are stored as hashes.  Status controls whether the
 * user may authenticate.
 */
export interface IUser extends Document {
  fullName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  roleIds: Types.ObjectId[];
  address?: IAddress;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  roleIds: { type: [Schema.Types.ObjectId], ref: 'Role', default: [] },
  address: { type: addressSchema },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  lastLoginAt: { type: Date },
}, { timestamps: true });

export default model<IUser>('User', UserSchema);