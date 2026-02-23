import type {
  InventoryItem,
  InventoryListParams,
  AdjustInventoryBody,
  ShipmentDocument,
  ShipmentListParams,
} from '../types';
import { mrpeasyConfig } from '../config';
import { logger } from '../lib/logger';
import { MrpeasyError, ErrorCodes } from '../lib/errors';

export interface IMrpeasyClient {
  getInventory(params?: InventoryListParams): Promise<InventoryItem[]>;
  getInventoryBySku(sku: string): Promise<InventoryItem | null>;
  getLowStock(threshold?: number): Promise<InventoryItem[]>;
  getShipments(params?: ShipmentListParams): Promise<ShipmentDocument[]>;
  getShipmentById(id: string): Promise<ShipmentDocument | null>;
  patchInventory(sku: string, body: Partial<InventoryItem>): Promise<InventoryItem>;
  adjustInventory(body: AdjustInventoryBody): Promise<InventoryItem>;
  deleteInventory(sku: string): Promise<void>;
}

const now = (): string => new Date().toISOString();
const parseMaybeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};
const parseMaybeString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

function toInventoryItem(raw: any, fallbackSku?: string): InventoryItem {
  const sku =
    (typeof raw?.sku === 'string' && raw.sku.trim()) ||
    (typeof raw?.code === 'string' && raw.code.trim()) ||
    (fallbackSku?.trim() ?? '') ||
    '';

  const quantity =
    parseMaybeNumber(raw?.quantity) ??
    parseMaybeNumber(raw?.qty) ??
    parseMaybeNumber(raw?.stock) ??
    parseMaybeNumber(raw?.stock_qty) ??
    parseMaybeNumber(raw?.quantity_on_hand) ??
    parseMaybeNumber(raw?.on_hand) ??
    0;

  const reorderPoint =
    parseMaybeNumber(raw?.reorderPoint) ??
    parseMaybeNumber(raw?.reorder_point) ??
    parseMaybeNumber(raw?.min_qty);

  const reorderQty =
    parseMaybeNumber(raw?.reorderQty) ??
    parseMaybeNumber(raw?.reorder_qty) ??
    parseMaybeNumber(raw?.order_qty);

  const basePrice =
    parseMaybeNumber(raw?.basePrice) ??
    parseMaybeNumber(raw?.base_price) ??
    parseMaybeNumber(raw?.costPrice) ??
    parseMaybeNumber(raw?.cost_price) ??
    parseMaybeNumber(raw?.purchase_price);

  const salePrice =
    parseMaybeNumber(raw?.salePrice) ??
    parseMaybeNumber(raw?.sale_price) ??
    parseMaybeNumber(raw?.price) ??
    parseMaybeNumber(raw?.selling_price);

  const updatedAt =
    (typeof raw?.updatedAt === 'string' && raw.updatedAt) ||
    (typeof raw?.updated_at === 'string' && raw.updated_at) ||
    now();

  return {
    sku,
    quantity,
    reorderPoint,
    reorderQty,
    basePrice,
    salePrice,
    name: typeof raw?.name === 'string' ? raw.name : undefined,
    updatedAt,
  };
}

function toShipmentLine(raw: any): ShipmentDocument['lines'][number] {
  return {
    sku: parseMaybeString(raw?.sku) ?? parseMaybeString(raw?.code) ?? parseMaybeString(raw?.item_code),
    name: parseMaybeString(raw?.name) ?? parseMaybeString(raw?.item_name) ?? parseMaybeString(raw?.description),
    qty: parseMaybeNumber(raw?.qty) ?? parseMaybeNumber(raw?.quantity),
    pickedQty: parseMaybeNumber(raw?.picked_qty) ?? parseMaybeNumber(raw?.qty_picked),
    shippedQty: parseMaybeNumber(raw?.shipped_qty) ?? parseMaybeNumber(raw?.qty_shipped),
    unit: parseMaybeString(raw?.unit),
  };
}

function toShipmentDocument(raw: any, index: number): ShipmentDocument {
  const id =
    parseMaybeString(raw?.id) ??
    parseMaybeString(raw?.shipment_id) ??
    parseMaybeString(raw?.doc_id) ??
    parseMaybeString(raw?.number) ??
    parseMaybeString(raw?.code) ??
    `shipment-${index}`;

  const linesRaw = Array.isArray(raw?.lines)
    ? raw.lines
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.rows)
        ? raw.rows
        : [];

  return {
    id,
    number:
      parseMaybeString(raw?.number) ??
      parseMaybeString(raw?.code) ??
      parseMaybeString(raw?.shipment_no) ??
      parseMaybeString(raw?.document_no),
    status: parseMaybeString(raw?.status) ?? parseMaybeString(raw?.state),
    customerName:
      parseMaybeString(raw?.customer_name) ??
      parseMaybeString(raw?.customer) ??
      parseMaybeString(raw?.customer?.name),
    warehouse:
      parseMaybeString(raw?.warehouse_name) ??
      parseMaybeString(raw?.warehouse) ??
      parseMaybeString(raw?.warehouse?.name),
    sourceDocument:
      parseMaybeString(raw?.source_document) ??
      parseMaybeString(raw?.source_document_no) ??
      parseMaybeString(raw?.order_no) ??
      parseMaybeString(raw?.sales_order_no),
    plannedDate:
      parseMaybeString(raw?.planned_date) ??
      parseMaybeString(raw?.plannedDate) ??
      parseMaybeString(raw?.ship_by),
    shipDate:
      parseMaybeString(raw?.ship_date) ??
      parseMaybeString(raw?.shipped_date) ??
      parseMaybeString(raw?.shipped_at),
    trackingNumber:
      parseMaybeString(raw?.tracking_no) ??
      parseMaybeString(raw?.tracking_number) ??
      parseMaybeString(raw?.waybill_no),
    carrier: parseMaybeString(raw?.carrier) ?? parseMaybeString(raw?.carrier_name),
    lines: linesRaw.map((line) => toShipmentLine(line)),
  };
}

const mockStore = new Map<string, InventoryItem>([
  ['MOCK-001', { sku: 'MOCK-001', quantity: 10, reorderPoint: 5, reorderQty: 20, basePrice: 15, salePrice: 22, name: 'Mock Item 1', updatedAt: now() }],
  ['MOCK-002', { sku: 'MOCK-002', quantity: 3, reorderPoint: 5, reorderQty: 10, basePrice: 11, salePrice: 18, name: 'Mock Item 2', updatedAt: now() }],
  ['MOCK-003', { sku: 'MOCK-003', quantity: 0, reorderPoint: 2, basePrice: 8, salePrice: 14, name: 'Mock Item 3', updatedAt: now() }],
  ['MOCK-004', { sku: 'MOCK-004', quantity: 10, reorderPoint: 2, basePrice: 9.5, salePrice: 16, name: 'Mock Item 4', updatedAt: now() }],
]);
const mockShipments: ShipmentDocument[] = [
  {
    id: 'SHP-1001',
    number: 'SHP-1001',
    status: 'picked',
    customerName: 'Acme Foods Ltd',
    warehouse: 'Main Warehouse',
    sourceDocument: 'SO-2045',
    plannedDate: now(),
    trackingNumber: 'TRK-123456',
    carrier: 'DHL',
    lines: [
      { sku: 'MOCK-001', name: 'Mock Item 1', qty: 4, pickedQty: 4, shippedQty: 0, unit: 'pcs' },
      { sku: 'MOCK-002', name: 'Mock Item 2', qty: 1, pickedQty: 1, shippedQty: 0, unit: 'pcs' },
    ],
  },
  {
    id: 'SHP-1002',
    number: 'SHP-1002',
    status: 'shipped',
    customerName: 'Bluewater Retail',
    warehouse: 'Secondary Warehouse',
    sourceDocument: 'SO-2051',
    plannedDate: now(),
    shipDate: now(),
    trackingNumber: 'TRK-7891011',
    carrier: 'UPS',
    lines: [{ sku: 'MOCK-004', name: 'Mock Item 4', qty: 2, pickedQty: 2, shippedQty: 2, unit: 'pcs' }],
  },
];

function cloneItem(item: InventoryItem): InventoryItem {
  return { ...item, updatedAt: now() };
}

export class MockMrpeasyClient implements IMrpeasyClient {
  async getInventory(params?: InventoryListParams): Promise<InventoryItem[]> {
    const list = Array.from(mockStore.values()).map(cloneItem);
    const offset = Math.max(0, params?.offset ?? 0);
    const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
    return list.slice(offset, offset + limit);
  }

  async getInventoryBySku(sku: string): Promise<InventoryItem | null> {
    const item = mockStore.get(sku);
    return item ? cloneItem(item) : null;
  }

  async getLowStock(threshold: number = 5): Promise<InventoryItem[]> {
    const list = Array.from(mockStore.values());
    return list.filter((i) => i.quantity < threshold).map(cloneItem);
  }

  async getShipments(params?: ShipmentListParams): Promise<ShipmentDocument[]> {
    const offset = Math.max(0, params?.offset ?? 0);
    const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
    const status = params?.status?.toLowerCase();
    const list = status
      ? mockShipments.filter((row) => (row.status ?? '').toLowerCase() === status)
      : mockShipments;
    return list.slice(offset, offset + limit);
  }

  async getShipmentById(id: string): Promise<ShipmentDocument | null> {
    const row = mockShipments.find(
      (shipment) => shipment.id === id || shipment.number === id
    );
    return row ?? null;
  }

  async patchInventory(sku: string, body: Partial<InventoryItem>): Promise<InventoryItem> {
    const existing = mockStore.get(sku);
    if (!existing) {
      const err = new Error(`Inventory item not found: ${sku}`);
      (err as any).statusCode = 404;
      (err as any).code = 'NOT_FOUND';
      throw err;
    }
    const updated: InventoryItem = {
      ...existing,
      ...body,
      sku: existing.sku,
      updatedAt: now(),
    };
    mockStore.set(sku, updated);
    return cloneItem(updated);
  }

  async adjustInventory(body: AdjustInventoryBody): Promise<InventoryItem> {
    const existing = mockStore.get(body.sku);
    if (!existing) {
      const err = new Error(`Inventory item not found: ${body.sku}`);
      (err as any).statusCode = 404;
      (err as any).code = 'NOT_FOUND';
      throw err;
    }
    const newQty = existing.quantity + body.quantityDelta;
    const updated: InventoryItem = {
      ...existing,
      quantity: newQty,
      updatedAt: now(),
    };
    mockStore.set(body.sku, updated);
    return cloneItem(updated);
  }

  async deleteInventory(sku: string): Promise<void> {
    const existed = mockStore.delete(sku);
    if (!existed) {
      const err = new Error(`Inventory item not found: ${sku}`);
      (err as any).statusCode = 404;
      (err as any).code = 'NOT_FOUND';
      throw err;
    }
  }
}

class RealMrpeasyClient implements IMrpeasyClient {
  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const base = mrpeasyConfig.baseUrl.endsWith('/')
      ? mrpeasyConfig.baseUrl.slice(0, -1)
      : mrpeasyConfig.baseUrl;
    const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: string,
    path: string,
    options?: { query?: Record<string, string | number | undefined>; body?: unknown }
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), mrpeasyConfig.timeoutMs);
    const url = this.buildUrl(path, options?.query);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          api_key: mrpeasyConfig.apiKey,
          access_key: mrpeasyConfig.accessKey,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const safeMessage =
          response.status >= 500
            ? 'MRPeasy service unavailable'
            : `MRPeasy request failed with status ${response.status}`;
        throw new MrpeasyError(safeMessage, ErrorCodes.UPSTREAM_ERROR, response.status >= 500 ? 503 : 502);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const rawText = await response.text();
      if (!rawText.trim()) {
        return undefined as T;
      }

      return JSON.parse(rawText) as T;
    } catch (error) {
      if (error instanceof MrpeasyError) {
        throw error;
      }
      throw new MrpeasyError('MRPeasy upstream request failed', ErrorCodes.UPSTREAM_ERROR, 503, error);
    } finally {
      clearTimeout(timeout);
    }
  }

  async getInventory(params?: InventoryListParams): Promise<InventoryItem[]> {
    const res = await this.request<unknown[] | { data?: unknown[] }>('GET', '/items', {
      query: { limit: params?.limit, offset: params?.offset },
    });
    const rows = Array.isArray(res) ? res : res.data ?? [];
    return rows.map((row) => toInventoryItem(row)).filter((row) => row.sku);
  }

  async getInventoryBySku(sku: string): Promise<InventoryItem | null> {
    const list = await this.request<unknown[] | { data?: unknown[] }>('GET', '/items', {
      query: { code: sku },
    });
    const rows = (Array.isArray(list) ? list : list.data ?? [])
      .map((row) => toInventoryItem(row))
      .filter((row) => row.sku);
    return rows.find((row) => row.sku === sku) ?? null;
  }

  async getLowStock(threshold: number = 5): Promise<InventoryItem[]> {
    const all = await this.getInventory();
    return all.filter((item) => item.quantity < threshold);
  }

  async getShipments(params?: ShipmentListParams): Promise<ShipmentDocument[]> {
    const res = await this.request<unknown[] | { data?: unknown[] }>('GET', '/shipments', {
      query: {
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        from_date: params?.fromDate,
        to_date: params?.toDate,
      },
    });
    const rows = Array.isArray(res) ? res : res.data ?? [];
    return rows.map((row, index) => toShipmentDocument(row, index));
  }

  async getShipmentById(id: string): Promise<ShipmentDocument | null> {
    const res = await this.request<unknown | { data?: unknown }>(
      'GET',
      `/shipments/${encodeURIComponent(id)}`
    );
    const raw = (res as any)?.data ?? res;
    if (!raw) return null;
    return toShipmentDocument(raw, 0);
  }

  async patchInventory(sku: string, body: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await this.request<unknown>('PUT', `/items/${encodeURIComponent(sku)}`, { body });
    return toInventoryItem(response, sku);
  }

  async adjustInventory(body: AdjustInventoryBody): Promise<InventoryItem> {
    const response = await this.request<unknown>('POST', '/inventory-adjustments', {
      body: {
        sku: body.sku,
        quantity_delta: body.quantityDelta,
        reason: body.reason,
      },
    });
    return toInventoryItem(response, body.sku);
  }

  async deleteInventory(sku: string): Promise<void> {
    await this.request<unknown>('DELETE', `/items/${encodeURIComponent(sku)}`);
  }
}

class MissingCredentialsClient implements IMrpeasyClient {
  private throwConfigError(): never {
    throw new MrpeasyError(
      'MRPeasy real mode requires MRPEASY_BASE_URL, MRPEASY_API_KEY, and MRPEASY_ACCESS_KEY',
      ErrorCodes.MODULE_DISABLED,
      503
    );
  }

  async getInventory(_params?: InventoryListParams): Promise<InventoryItem[]> {
    this.throwConfigError();
  }

  async getInventoryBySku(_sku: string): Promise<InventoryItem | null> {
    this.throwConfigError();
  }

  async getLowStock(_threshold?: number): Promise<InventoryItem[]> {
    this.throwConfigError();
  }

  async getShipments(_params?: ShipmentListParams): Promise<ShipmentDocument[]> {
    this.throwConfigError();
  }

  async getShipmentById(_id: string): Promise<ShipmentDocument | null> {
    this.throwConfigError();
  }

  async patchInventory(_sku: string, _body: Partial<InventoryItem>): Promise<InventoryItem> {
    this.throwConfigError();
  }

  async adjustInventory(_body: AdjustInventoryBody): Promise<InventoryItem> {
    this.throwConfigError();
  }

  async deleteInventory(_sku: string): Promise<void> {
    this.throwConfigError();
  }
}

export function createMrpeasyClient(): IMrpeasyClient {
  if (mrpeasyConfig.isMockMode()) {
    logger.info('Using MockMrpeasyClient (MRPEASY_USE_MOCK=true)');
    return new MockMrpeasyClient();
  }

  if (!mrpeasyConfig.hasRealCredentials()) {
    logger.warn('MRPeasy real mode requested but required credentials are missing');
    return new MissingCredentialsClient();
  }

  logger.info('Using RealMrpeasyClient with api_key/access_key headers');
  return new RealMrpeasyClient();
}
