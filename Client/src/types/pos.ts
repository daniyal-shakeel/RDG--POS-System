export type DocumentType = 'invoice' | 'receipt' | 'credit_note' | 'refund' | 'estimate';

// Per-document-type statuses
export type EstimateStatus = 'draft' | 'pending' | 'accepted' | 'converted' | 'expired';
export type InvoiceStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'overpaid';
export type ReceiptStatus = 'draft' | 'completed';
export type CreditNoteStatus = 'DRAFT' | 'APPROVED';
export type RefundStatus = 'DRAFT' | 'REFUNDED';

// Combined status type for documents
export type DocumentStatus =
  | EstimateStatus
  | InvoiceStatus
  | ReceiptStatus
  | CreditNoteStatus
  | RefundStatus;

export type UserRole = 'super_admin' | 'admin' | 'sales_rep' | 'stock_keeper';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface LineItem {
  id: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  billingAddress: string;
  shippingAddress: string;
}

export interface SalesDocument {
  id: string;
  type: DocumentType;
  refNumber: string;
  date: Date;
  dueDate?: Date;
  terms?: string;
  customer: Customer;
  items: LineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  balanceDue: number;
  deposit: number;
  status: DocumentStatus;
  salesRep: string;
  signature?: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  convertedFrom?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  avatar?: string;
  permissions?: string[];
}

export interface DeviceStatus {
  ct60: 'connected' | 'disconnected' | 'scanning';
  rp4: 'connected' | 'disconnected' | 'printing';
}

export interface SalesStats {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  pendingInvoices: number;
  documentsToday: number;
}
