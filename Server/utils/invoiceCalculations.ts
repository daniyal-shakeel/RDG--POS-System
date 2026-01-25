/**
 * Shared Invoice Calculation Utility
 * 
 * This is the SINGLE SOURCE OF TRUTH for all invoice calculations.
 * Both create and update operations MUST use these functions.
 * The client can mirror this logic for live UI updates, but the backend
 * always recomputes and persists the final values.
 */

export const TAX_RATE = 0.125; // 12.5% VAT

export type InvoiceStatus = "draft" | "pending" | "partial" | "paid" | "overpaid";

export interface InvoiceItem {
  productCode: string;
  description: string;
  quantity: number;
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
 *   (this is handled by allowing the deposit when balance > 0)
 * 
 * @param currentBalance The current balance BEFORE this deposit operation
 * @param newDepositAmount The new total deposit amount being set
 * @param previousDepositAmount The previous total deposit amount
 * @returns { allowed: boolean; message?: string }
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
 * This MUST be called on every create and update operation
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
 * Validate and normalize an item, calculating its amount
 * Returns the normalized item with computed amount
 */
export function normalizeAndValidateItem(
  item: {
    productCode?: string;
    description?: string;
    quantity?: number;
    price?: number;
    discount?: number;
  },
  index: number
): InvoiceItem {
  const errors: string[] = [];
  const productCode = (item.productCode || "").trim();
  const description = (item.description || "").trim();
  const quantity = Number(item.quantity ?? 0);
  const price = Number(item.price ?? 0);
  const discount = Number(item.discount ?? 0);

  if (!productCode) errors.push("productCode is required");
  if (!description) errors.push("description is required");
  if (!Number.isFinite(quantity) || quantity <= 0) errors.push("quantity must be > 0");
  if (!Number.isFinite(price) || price < 0) errors.push("price must be >= 0");
  if (!Number.isFinite(discount) || discount < 0 || discount > 100)
    errors.push("discount must be between 0 and 100");

  if (errors.length) {
    throw new Error(`Item ${index + 1}: ${errors.join(", ")}`);
  }

  const amount = Number((quantity * price * (1 - discount / 100)).toFixed(2));
  return { productCode, description, quantity, discount, amount };
}

/**
 * Calculate the total deposit received from base invoice + all edits
 */
export function calculateTotalDepositReceived(
  baseDeposit: number,
  editDeposits: number[]
): number {
  // Note: In the new model, each edit stores its CUMULATIVE deposit,
  // so we just need the latest edit's depositReceived or the base if no edits
  // But for audit purposes, we may want to track deposit added per edit
  // For now, return the latest cumulative deposit
  const total = editDeposits.length > 0
    ? editDeposits[editDeposits.length - 1]
    : baseDeposit;
  return Number(total.toFixed(2));
}
