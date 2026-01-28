import { Schema, model, Document, Types } from 'mongoose';

/**
 * ICreditNoteProduct models a product on a credit note
 */
export interface ICreditNoteProduct {
  productCode: string;
  description?: string;
  quantity: number;
  price: number;
}

/**
 * CreditNote represents a credit issued to a customer
 * Can be created standalone or from an invoice (future feature)
 */
export interface ICreditNote extends Document {
  creditNoteNumber: string; // Unique reference (format: CN-XXXX-XXXX)
  source: 'FROM_INVOICE' | 'STANDALONE';
  customerId: Types.ObjectId;
  salesRepId: Types.ObjectId;
  products: ICreditNoteProduct[];
  message?: string;
  salesRepSignature: string;
  status: 'DRAFT' | 'APPROVED';
  createdAt: Date;
  updatedAt: Date;
}

const CreditNoteProductSchema = new Schema<ICreditNoteProduct>(
  {
    productCode: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0.01 }, // Must be > 0
    price: { type: Number, required: true, min: 0 }, // Must be >= 0
  },
  { _id: false }
);

const CreditNoteSchema = new Schema<ICreditNote>(
  {
    creditNoteNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['FROM_INVOICE', 'STANDALONE'],
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
    products: {
      type: [CreditNoteProductSchema],
      default: [],
      validate: {
        validator: function (products: ICreditNoteProduct[]) {
          return products && products.length > 0;
        },
        message: 'At least one product is required',
      },
    },
    message: { type: String, trim: true },
    salesRepSignature: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED'],
      required: true,
      default: 'DRAFT',
    },
  },
  { timestamps: true }
);

export default model<ICreditNote>('CreditNote', CreditNoteSchema);
