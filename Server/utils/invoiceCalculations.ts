








export const TAX_RATE = 0.125; 

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




export function calculateSubtotal(items: InvoiceItem[]): number {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return Number(subtotal.toFixed(2));
}




export function calculateTax(subtotal: number): number {
  return Number((subtotal * TAX_RATE).toFixed(2));
}




export function calculateTotal(subtotal: number, tax: number): number {
  return Number((subtotal + tax).toFixed(2));
}





export function calculateBalanceDue(total: number, depositReceived: number): number {
  const balance = total - depositReceived;
  
  if (Math.abs(balance) < 0.01) {
    return 0;
  }
  return Number(balance.toFixed(2));
}










export function deriveStatusFromBalance(balanceDue: number, depositReceived: number): InvoiceStatus {
  if (balanceDue > 0) {
    return depositReceived > 0 ? "partial" : "pending";
  }
  if (balanceDue === 0) {
    return "paid";
  }
  
  return "overpaid";
}















export function canAcceptDeposit(
  currentBalance: number,
  newDepositAmount: number,
  previousDepositAmount: number
): { allowed: boolean; message?: string } {
  
  if (newDepositAmount < previousDepositAmount) {
    return {
      allowed: false,
      message: "Deposit amount cannot be reduced",
    };
  }
  
  
  if (newDepositAmount === previousDepositAmount) {
    return { allowed: true };
  }
  
  
  if (currentBalance <= 0) {
    return {
      allowed: false,
      message: "This invoice is already fully paid. No further deposits can be accepted.",
    };
  }
  
  
  return { allowed: true };
}





export function calculateInvoice(input: InvoiceCalculationInput): InvoiceCalculationResult {
  const { items, depositReceived } = input;
  
  const subtotal = calculateSubtotal(items);
  const tax = calculateTax(subtotal);
  const total = calculateTotal(subtotal, tax);
  const balanceDue = calculateBalanceDue(total, depositReceived);
  const status = deriveStatusFromBalance(balanceDue, depositReceived);
  
  
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




export function calculateTotalDepositReceived(
  baseDeposit: number,
  editDeposits: number[]
): number {
  
  
  
  
  const total = editDeposits.length > 0
    ? editDeposits[editDeposits.length - 1]
    : baseDeposit;
  return Number(total.toFixed(2));
}
