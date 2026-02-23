import { Schema, model, Document, Types } from "mongoose";




export interface IDepositRecord {
  amount: number;
  paymentMethod: "cash" | "card" | "bank_transfer" | "cheque" | "other";
  invoiceId: Types.ObjectId;
  date: Date;
  recordedBy?: Types.ObjectId;
  reference?: string;
  notes?: string;
}












export interface IPayment extends Document {
  customerId: Types.ObjectId;
  invoiceIds: Types.ObjectId[];
  deposits: IDepositRecord[];
  amount: number;
  totalSpent: number;
  depositCount: number;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "cheque" | "other"; 
  reference?: string; 
  notes?: string; 
  recordedBy?: Types.ObjectId; 
  paymentDate: Date; 
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
    
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer ID is required"],
      index: true,
      unique: true, 
    },
    
    
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
    
    paymentMethod: {
      type: String,
      enum: {
        values: ["cash", "card", "bank_transfer", "cheque", "other"],
        message: "Payment method must be one of: cash, card, bank_transfer, cheque, other",
      },
      default: "cash",
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
    
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    
    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
      default: Date.now,
      validate: {
        validator: function (value: Date) {
          
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





PaymentSchema.index({ invoiceIds: 1 });


PaymentSchema.index({ paymentDate: -1 });


PaymentSchema.index({ customerId: 1, paymentDate: -1 });

export default model<IPayment>("Payment", PaymentSchema);
