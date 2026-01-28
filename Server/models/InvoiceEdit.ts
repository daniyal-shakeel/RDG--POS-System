import { Schema, model, Document, Types } from "mongoose";

/**
 * Line items stored on an invoice edit.
 */
export interface IInvoiceEditItem {
  productCode: string;
  description: string;
  quantity: number;
  discount?: number;
  amount: number;
}

/**
 * Invoice edit captures updated invoice data while preserving history.
 */
export interface IInvoiceEdit extends Document {
  invoiceReference: string;
  baseInvoiceId: Types.ObjectId;
  previousVersionId?: Types.ObjectId;
  previousVersionSource?: "invoice" | "edit";
  customerId: Types.ObjectId;
  salesRep?: Types.ObjectId;
  items: IInvoiceEditItem[];
  message?: string;
  signature?: string;
  estimateReference?: string;
  convertedFromEstimate?: Types.ObjectId;
  paymentTerms: "net7" | "net15" | "net30" | "net60" | "dueOnReceipt";
  depositReceived: number;
  depositAdded: number;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "cheque" | "other";
  balanceAfterEdit: number;
  status: "draft" | "pending" | "partial" | "paid" | "overpaid";
  total: number;
  due: number;
  balanceDue: number;
  issuedAt: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceEditItemSchema = new Schema<IInvoiceEditItem>(
  {
    productCode: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceEditSchema = new Schema<IInvoiceEdit>(
  {
    invoiceReference: { type: String, required: true, trim: true },
    baseInvoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    previousVersionId: { type: Schema.Types.ObjectId },
    previousVersionSource: { type: String, enum: ["invoice", "edit"] },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    salesRep: { type: Schema.Types.ObjectId, ref: "User" },
    items: { type: [InvoiceEditItemSchema], default: [] },
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
    depositAdded: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "cheque", "other"],
    },
    balanceAfterEdit: { type: Number, default: 0 },
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

export default model<IInvoiceEdit>("InvoiceEdit", InvoiceEditSchema);
