import { Schema, model, Document, Types } from 'mongoose';

/**
 * IRefundProduct models a product on a refund
 */
export interface IRefundProduct {
  productCode: string;
  description?: string;
  quantity: number;
  price: number;
}

/**
 * Refund represents a refund issued to a customer
 * Can be created standalone or from a credit note
 */
export interface IRefund extends Document {
  refundNumber: string; // Unique reference (format: REF-XXXX-XXXX)
  source: 'FROM_CREDITNOTE' | 'STANDALONE';
  customerId: Types.ObjectId;
  salesRepId: Types.ObjectId;
  creditNoteId?: Types.ObjectId; // Reference to credit note if source is FROM_CREDITNOTE
  products: IRefundProduct[];
  message?: string;
  salesRepSignature: string;
  status: 'DRAFT' | 'REFUNDED';
  createdAt: Date;
  updatedAt: Date;
}

const RefundProductSchema = new Schema<IRefundProduct>(
  {
    productCode: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0.01 }, // Must be > 0
    price: { type: Number, required: true, min: 0 }, // Must be >= 0
  },
  { _id: false }
);

const RefundSchema = new Schema<IRefund>(
  {
    refundNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['FROM_CREDITNOTE', 'STANDALONE'],
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    salesRepId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    creditNoteId: {
      type: Schema.Types.ObjectId,
      ref: 'CreditNote',
    },
    products: {
      type: [RefundProductSchema],
      default: [],
      validate: {
        validator: function (products: IRefundProduct[]) {
          return products && products.length > 0;
        },
        message: 'At least one product is required',
      },
    },
    message: { type: String, trim: true },
    salesRepSignature: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'REFUNDED'],
      required: true,
      default: 'DRAFT',
    },
  },
  { timestamps: true }
);

export default model<IRefund>('Refund', RefundSchema);
