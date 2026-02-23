import api from './api';

export type MrpeasyInventoryItem = {
  sku: string;
  quantity: number;
  reorderPoint?: number;
  reorderQty?: number;
  basePrice?: number;
  salePrice?: number;
  name?: string;
  updatedAt?: string;
};

export type MrpeasyInventorySum = {
  totalInventoryCost: number;
  itemCount: number;
  pricedItemCount: number;
};

export type MrpeasyShipmentLine = {
  sku?: string;
  name?: string;
  qty?: number;
  pickedQty?: number;
  shippedQty?: number;
  unit?: string;
};

export type MrpeasyShipment = {
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
  lines?: MrpeasyShipmentLine[];
};

type MrpeasyResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

export const getMrpeasyInventory = async (params?: { limit?: number; offset?: number }) => {
  const response = await api.get<MrpeasyResponse<MrpeasyInventoryItem[]>>('/api/v1/mrpeasy/inventory', {
    params,
  });
  return response.data;
};

export const getMrpeasyInventoryBySku = async (sku: string) => {
  const response = await api.get<MrpeasyResponse<MrpeasyInventoryItem>>(
    `/api/v1/mrpeasy/inventory/${encodeURIComponent(sku)}`
  );
  return response.data;
};

export const getMrpeasyLowStock = async (threshold?: number) => {
  const response = await api.get<MrpeasyResponse<MrpeasyInventoryItem[]>>('/api/v1/mrpeasy/inventory/low-stock', {
    params: threshold !== undefined ? { threshold } : undefined,
  });
  return response.data;
};

export const getMrpeasyInventorySum = async () => {
  const response = await api.get<MrpeasyResponse<MrpeasyInventorySum>>('/api/v1/mrpeasy/inventory/sum');
  return response.data;
};

export const getMrpeasyShipments = async (params?: {
  limit?: number;
  offset?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  const response = await api.get<MrpeasyResponse<MrpeasyShipment[]>>('/api/v1/mrpeasy/shipments', { params });
  return response.data;
};

export const getMrpeasyShipmentById = async (id: string) => {
  const response = await api.get<MrpeasyResponse<MrpeasyShipment>>(
    `/api/v1/mrpeasy/shipments/${encodeURIComponent(id)}`
  );
  return response.data;
};

export const patchMrpeasyInventory = async (
  sku: string,
  body: Partial<Pick<MrpeasyInventoryItem, 'name' | 'quantity' | 'reorderPoint' | 'reorderQty' | 'basePrice' | 'salePrice'>>
) => {
  const response = await api.patch<MrpeasyResponse<MrpeasyInventoryItem>>(
    `/api/v1/mrpeasy/inventory/${encodeURIComponent(sku)}`,
    body
  );
  return response.data;
};

export const adjustMrpeasyInventory = async (body: {
  sku: string;
  quantityDelta: number;
  reason?: string;
  idempotencyKey?: string;
}) => {
  const response = await api.post<MrpeasyResponse<MrpeasyInventoryItem>>('/api/v1/mrpeasy/inventory/adjust', body);
  return response.data;
};

export const deleteMrpeasyInventory = async (sku: string) => {
  const response = await api.delete<MrpeasyResponse<{ sku: string; deleted: boolean }>>(
    `/api/v1/mrpeasy/inventory/${encodeURIComponent(sku)}`
  );
  return response.data;
};
