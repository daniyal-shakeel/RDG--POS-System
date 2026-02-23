







export const TAX_RATE = 0.125; 

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




export function calculateItemAmount(quantity: number, unitPrice: number, discount: number): number {
  return Number((quantity * unitPrice * (1 - discount / 100)).toFixed(2));
}
