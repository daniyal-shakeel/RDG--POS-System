export interface InventoryItem {
  sku: string;
  quantity: number;
  reorderPoint?: number;
  reorderQty?: number;
  basePrice?: number;
  salePrice?: number;
  name?: string;
  updatedAt?: string;
}

export interface InventoryListParams {
  limit?: number;
  offset?: number;
}

export interface AdjustInventoryBody {
  sku: string;
  quantityDelta: number;
  reason?: string;
  idempotencyKey?: string;
}

export interface InventoryCostSummary {
  totalInventoryCost: number;
  itemCount: number;
  pricedItemCount: number;
}

export interface ShipmentLine {
  sku?: string;
  name?: string;
  qty?: number;
  pickedQty?: number;
  shippedQty?: number;
  unit?: string;
}

export interface ShipmentDocument {
  id: string;
  number?: string;
  status?: string;
  customerName?: string;
  warehouse?: string;
  sourceDocument?: string;
  plannedDate?: string;
  shipDate?: string;
  trackingNumber?: string;
  carrier?: string;
  lines?: ShipmentLine[];
}

export interface ShipmentListParams {
  limit?: number;
  offset?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  sku: string;
  operation: string;
  previousQty?: number;
  newQty?: number;
  delta?: number;
  reason?: string;
}

export interface MrpeasySuccessResponse<T> {
  success: true;
  data: T;
}

export interface MrpeasyErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type MrpeasyApiResponse<T> = MrpeasySuccessResponse<T> | MrpeasyErrorResponse;
