import { Schema, model, Document } from 'mongoose';

/**
 * Address subdocument used for billing and shipping addresses on a customer.
 */
interface IAddress {
  city?: string;
  country?: string;
  postalCode?: string;
  state?: string;
  street?: string;
}

/**
 * Customer stores the contact and account details for a customer.
 */
interface ICustomer extends Document {
  customerCode: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: IAddress;
  shippingAddress?: IAddress;
  notes?: string;
  creditLimit?: number;
  balance?: number;
  status: 'active' | 'archived';
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

const CustomerSchema = new Schema<ICustomer>(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {type:String, required: true},
    phone: {type:String, required: true},
    billingAddress: {type:addressSchema, required: true},
    shippingAddress: addressSchema,
    notes: String,
    creditLimit: Number,
    balance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

/**
 * IMPORTANT:
 * customerCode must be globally unique
 */

/**
 * Export model named "Customer"
 */
const Customer = model<ICustomer>('Customer', CustomerSchema);
export { ICustomer, IAddress };
export default Customer;
