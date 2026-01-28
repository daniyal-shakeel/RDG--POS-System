import { Schema, model, Document, Types } from "mongoose";

/**
 * Line items stored on an invoice.
 */
export interface IInvoiceItem {
  productCode: string;
  description: string;
  quantity: number;
  discount?: number;
  amount: number;
}

/**
 * Invoice model captures issued invoices, payments, and status state.
 * - If converted from an estimate, the same signature should be reused.
 * - Status rules (handled in business logic):
 *   - depositReceived === total -> paid
 *   - 0 < depositReceived < total -> partial (balance/due updated)
 *   - depositReceived === 0 -> pending (default stays draft until issued)
 */
export interface IInvoice extends Document {
  invoiceNumber: string;
  editIds?: Types.ObjectId[];
  editCount: number;
  depositReceivedTotal?: number;
  customerId: Types.ObjectId;
  salesRep?: Types.ObjectId;
  paymentId?: Types.ObjectId; // Reference to the payment record (all invoices with same payment share same paymentId)
  items: IInvoiceItem[];
  message?: string;
  signature?: string;
  estimateReference?: string;
  convertedFromEstimate?: Types.ObjectId;
  paymentTerms: "net7" | "net15" | "net30" | "net60" | "dueOnReceipt";
  depositReceived: number;
  status: "draft" | "pending" | "partial" | "paid" | "overpaid";
  total: number;
  due: number;
  balanceDue: number;
  issuedAt: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    productCode: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    editIds: { type: [Schema.Types.ObjectId], ref: "InvoiceEdit", default: [] },
    editCount: { type: Number, default: 0, min: 0 },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    salesRep: { type: Schema.Types.ObjectId, ref: "User" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    items: { type: [InvoiceItemSchema], default: [] },
    message: { type: String },
    signature: { type: String },
    estimateReference: { type: String, trim: true },
    convertedFromEstimate: { type: Schema.Types.ObjectId, ref: "Estimate" },
    paymentTerms: {
      type: String,
      enum: ["net7", "net15", "net30", "net60", "dueOnReceipt"],
      default: "dueOnReceipt",
    },
    depositReceived: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["draft", "pending", "partial", "paid", "overpaid"],
      default: "draft",
    },
    total: { type: Number, required: true, default: 0, min: 0 },
    due: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0 },
    issuedAt: { type: Date, default: Date.now },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

export default model<IInvoice>("Invoice", InvoiceSchema);