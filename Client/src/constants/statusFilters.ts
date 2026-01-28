import { EstimateStatus, InvoiceStatus, ReceiptStatus, UserStatus } from '@/types/pos';

export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  accepted: 'Accepted',
  converted: 'Converted',
  expired: 'Expired',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
  overpaid: 'Overpaid',
};

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  draft: 'Draft',
  completed: 'Completed',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

export const ESTIMATE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: ESTIMATE_STATUS_LABELS.draft },
  { value: 'pending', label: ESTIMATE_STATUS_LABELS.pending },
  { value: 'accepted', label: ESTIMATE_STATUS_LABELS.accepted },
  { value: 'converted', label: ESTIMATE_STATUS_LABELS.converted },
  { value: 'expired', label: ESTIMATE_STATUS_LABELS.expired },
] as const;

export const INVOICE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: INVOICE_STATUS_LABELS.draft },
  { value: 'pending', label: INVOICE_STATUS_LABELS.pending },
  { value: 'partial', label: INVOICE_STATUS_LABELS.partial },
  { value: 'paid', label: INVOICE_STATUS_LABELS.paid },
  { value: 'overpaid', label: INVOICE_STATUS_LABELS.overpaid },
] as const;

export const RECEIPT_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: RECEIPT_STATUS_LABELS.draft },
  { value: 'completed', label: RECEIPT_STATUS_LABELS.completed },
] as const;
export const CREDIT_NOTE_STATUS_LABELS = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
} as const;

export const CREDIT_NOTE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'DRAFT', label: CREDIT_NOTE_STATUS_LABELS.DRAFT },
  { value: 'APPROVED', label: CREDIT_NOTE_STATUS_LABELS.APPROVED },
] as const;
export const REFUND_STATUS_LABELS = {
  DRAFT: 'Draft',
  REFUNDED: 'Refunded',
} as const;

export const REFUND_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'DRAFT', label: REFUND_STATUS_LABELS.DRAFT },
  { value: 'REFUNDED', label: REFUND_STATUS_LABELS.REFUNDED },
] as const;

export const USER_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: USER_STATUS_LABELS.active },
  { value: 'inactive', label: USER_STATUS_LABELS.inactive },
  { value: 'suspended', label: USER_STATUS_LABELS.suspended },
] as const;
