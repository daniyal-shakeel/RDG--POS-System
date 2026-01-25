/**
 * Client-side Invoice Calculation Utility
 * 
 * This MIRRORS the backend calculation logic exactly.
 * Used for live UI updates when the user modifies items or deposits.
 * The backend is still the source of truth - this is only for instant feedback.
 */

export const TAX_RATE = 0.125; // 12.5% VAT

export type InvoiceStatus = "draft" | "pending" | "partial" | "paid" | "overpaid";

export interface InvoiceItem {
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

export interface InvoiceCalculationInput {
  items: InvoiceItem[];
  depositReceived: number;
}

export interface InvoiceCalculationResult {
  subtotal: number;
  tax: number;
  total: number;
  depositReceived: number;
  balanceDue: number;
  due: number;
  status: InvoiceStatus;
}

/**
 * Calculate the subtotal from items (sum of item amounts, before tax)
 */
export function calculateSubtotal(items: InvoiceItem[]): number {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return Number(subtotal.toFixed(2));
}

/**
 * Calculate tax based on subtotal
 */
export function calculateTax(subtotal: number): number {
  return Number((subtotal * TAX_RATE).toFixed(2));
}

/**
 * Calculate invoice total = subtotal + tax
 */
export function calculateTotal(subtotal: number, tax: number): number {
  return Number((subtotal + tax).toFixed(2));
}

/**
 * Calculate balance due = total - deposit
 * Can be negative (overpaid) or positive (still owes)
 */
export function calculateBalanceDue(total: number, depositReceived: number): number {
  const balance = total - depositReceived;
  // Handle floating point precision
  if (Math.abs(balance) < 0.01) {
    return 0;
  }
  return Number(balance.toFixed(2));
}

/**
 * Derive invoice status from balance
 * 
 * Rules:
 * - balance > 0 AND deposit > 0 -> "partial" (some payment received, but not fully paid)
 * - balance > 0 AND deposit === 0 -> "pending" (no payment received yet)
 * - balance === 0 -> "paid" (exactly paid)
 * - balance < 0 -> "overpaid" (paid more than owed)
 */
export function deriveStatusFromBalance(balanceDue: number, depositReceived: number): InvoiceStatus {
  if (balanceDue > 0) {
    return depositReceived > 0 ? "partial" : "pending";
  }
  if (balanceDue === 0) {
    return "paid";
  }
  // balanceDue < 0
  return "overpaid";
}

/**
 * Check if a deposit can be accepted based on current invoice state
 * 
 * Rules:
 * - If balance > 0 (partial/pending), deposits are allowed
 * - If balance <= 0 (paid/overpaid), NO further deposits allowed
 * - Exception: if adding a deposit pushes from partial to overpaid, allow it ONCE
 */
export function canAcceptDeposit(
  currentBalance: number,
  newDepositAmount: number,
  previousDepositAmount: number
): { allowed: boolean; message?: string } {
  // Deposit cannot be reduced
  if (newDepositAmount < previousDepositAmount) {
    return {
      allowed: false,
      message: "Deposit amount cannot be reduced",
    };
  }
  
  // No change in deposit is always allowed
  if (newDepositAmount === previousDepositAmount) {
    return { allowed: true };
  }
  
  // If current balance is <= 0 (paid/overpaid), reject new deposits
  if (currentBalance <= 0) {
    return {
      allowed: false,
      message: "This invoice is already fully paid. No further deposits can be accepted.",
    };
  }
  
  // Balance > 0, allow the deposit (even if it pushes to overpaid)
  return { allowed: true };
}

/**
 * Main calculation function that computes all invoice values
 * This mirrors the backend calculation exactly
 */
export function calculateInvoice(input: InvoiceCalculationInput): InvoiceCalculationResult {
  const { items, depositReceived } = input;
  
  const subtotal = calculateSubtotal(items);
  const tax = calculateTax(subtotal);
  const total = calculateTotal(subtotal, tax);
  const balanceDue = calculateBalanceDue(total, depositReceived);
  const status = deriveStatusFromBalance(balanceDue, depositReceived);
  
  // 'due' is the payable amount (never negative for UI display purposes)
  const due = Math.max(balanceDue, 0);
  
  return {
    subtotal,
    tax,
    total,
    depositReceived: Number(depositReceived.toFixed(2)),
    balanceDue,
    due,
    status,
  };
}

/**
 * Calculate item amount based on quantity, unit price, and discount
 */
export function calculateItemAmount(quantity: number, unitPrice: number, discount: number): number {
  return Number((quantity * unitPrice * (1 - discount / 100)).toFixed(2));
}
