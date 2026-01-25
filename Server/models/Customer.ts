import { Schema, model, Document, Types } from 'mongoose';

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
  salesRep?: Types.ObjectId;
  billingAddress?: IAddress;
  shippingAddress?: IAddress;
  notes?: string;
  creditLimit?: number;
  balance?: number;
  paymentId?: Types.ObjectId; // Reference to the payment record for this customer
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
    salesRep: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
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
