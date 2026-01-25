import { Schema, model, Document, Types } from "mongoose";

/**
 * Individual deposit record within a payment
 */
export interface IDepositRecord {
  amount: number;
  paymentMethod: "cash" | "card" | "bank_transfer" | "cheque" | "other";
  invoiceId: Types.ObjectId;
  date: Date;
  recordedBy?: Types.ObjectId;
  reference?: string;
  notes?: string;
}

/**
 * Payment model tracks payments made by customers against invoices.
 * 
 * Key fields:
 * 1. customerId - Who made the payment
 * 2. deposits - Array of individual deposit records (each with its own payment method)
 * 3. amount - Cumulative total amount (sum of all deposits)
 * 4. totalSpent - Cumulative total spent by customer (denormalized for quick access)
 * 5. invoiceIds - Array of invoices the payment is recorded against
 * 6. depositCount - Total number of deposits received across all invoices for this customer
 */
export interface IPayment extends Document {
  customerId: Types.ObjectId;
  invoiceIds: Types.ObjectId[];
  deposits: IDepositRecord[];
  amount: number;
  totalSpent: number;
  depositCount: number;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "cheque" | "other"; // Legacy field - latest payment method
  reference?: string; // Legacy field
  notes?: string; // Legacy field
  recordedBy?: Types.ObjectId; // Legacy field - latest recordedBy
  paymentDate: Date; // Legacy field - latest deposit date
  createdAt: Date;
  updatedAt: Date;
}

const DepositRecordSchema = new Schema<IDepositRecord>(
  {
    amount: {
      type: Number,
      required: [true, "Deposit amount is required"],
      min: [0.01, "Deposit amount must be greater than 0"],
      validate: {
        validator: function (value: number) {
          return Number.isFinite(value) && value > 0;
        },
        message: "Deposit amount must be a valid positive number",
      },
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: {
        values: ["cash", "card", "bank_transfer", "cheque", "other"],
        message: "Payment method must be one of: cash, card, bank_transfer, cheque, other",
      },
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: [true, "Invoice ID is required"],
    },
    date: {
      type: Date,
      required: [true, "Deposit date is required"],
      default: Date.now,
      validate: {
        validator: function (value: Date) {
          return value <= new Date();
        },
        message: "Deposit date cannot be in the future",
      },
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [100, "Reference cannot exceed 100 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPayment>(
  {
    // Who made the payment - required, must reference a valid customer
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer ID is required"],
      index: true,
      unique: true, // One payment record per customer
    },
    // Array of invoices the payment is recorded against
    // Same customer can deposit into multiple invoices, all tracked in one payment record
    invoiceIds: {
      type: [Schema.Types.ObjectId],
      ref: "Invoice",
      required: [true, "At least one invoice ID is required"],
      validate: {
        validator: function (value: Types.ObjectId[]) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one invoice ID is required",
      },
    },
    // Array of individual deposit records - each deposit has its own payment method
    deposits: {
      type: [DepositRecordSchema],
      default: [],
      validate: {
        validator: function (value: IDepositRecord[]) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one deposit record is required",
      },
    },
    // The payment amount - required, must be positive
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0.01, "Payment amount must be greater than 0"],
      validate: {
        validator: function (value: number) {
          return Number.isFinite(value) && value > 0;
        },
        message: "Payment amount must be a valid positive number",
      },
    },
    // Total spent by customer (cumulative) - denormalized for quick queries
    totalSpent: {
      type: Number,
      required: [true, "Total spent is required"],
      min: [0, "Total spent cannot be negative"],
      default: 0,
      validate: {
        validator: function (value: number) {
          return Number.isFinite(value) && value >= 0;
        },
        message: "Total spent must be a valid non-negative number",
      },
    },
    // Total number of deposits received across all invoices for this customer
    depositCount: {
      type: Number,
      required: [true, "Deposit count is required"],
      min: [1, "Deposit count must be at least 1"],
      default: 1,
      validate: {
        validator: function (value: number) {
          return Number.isInteger(value) && value >= 1;
        },
        message: "Deposit count must be a positive integer",
      },
    },
    // Payment method - optional but must be one of allowed values
    paymentMethod: {
      type: String,
      enum: {
        values: ["cash", "card", "bank_transfer", "cheque", "other"],
        message: "Payment method must be one of: cash, card, bank_transfer, cheque, other",
      },
      default: "cash",
    },
    // Reference number (e.g., transaction ID, cheque number)
    reference: {
      type: String,
      trim: true,
      maxlength: [100, "Reference cannot exceed 100 characters"],
    },
    // Additional notes
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    // Who recorded the payment (user/staff)
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // When the payment was made
    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
      default: Date.now,
      validate: {
        validator: function (value: Date) {
          // Payment date cannot be in the future
          return value <= new Date();
        },
        message: "Payment date cannot be in the future",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying payments by customer (unique - one payment per customer)
// customerId already has unique: true, so this index is implicit

// Index for querying payments by invoice (using array field)
PaymentSchema.index({ invoiceIds: 1 });

// Index for querying payments by date range
PaymentSchema.index({ paymentDate: -1 });

// Index for querying payments by customer sorted by date
PaymentSchema.index({ customerId: 1, paymentDate: -1 });

export default model<IPayment>("Payment", PaymentSchema);
