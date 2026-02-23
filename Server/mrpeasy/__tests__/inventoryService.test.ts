import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { IMrpeasyClient } from '../services/mrpeasyClient';
import type { InventoryItem, InventoryListParams, AdjustInventoryBody } from '../types';
import { createInventoryService } from '../services/inventoryService';
import { MrpeasyError, ErrorCodes } from '../lib/errors';

function createMockClient(overrides?: Partial<IMrpeasyClient>): IMrpeasyClient {
  const item: InventoryItem = { sku: 'TEST-001', quantity: 10, reorderPoint: 5 };
  return {
    getInventory: async (_params?: InventoryListParams) => [item],
    getInventoryBySku: async (sku: string) => (sku === 'TEST-001' ? { ...item } : null),
    getLowStock: async (_threshold = 5) => [item],
    getShipments: async () => [],
    patchInventory: async (sku: string, body: Partial<InventoryItem>) =>
      ({ ...item, ...body, sku, quantity: body.quantity ?? item.quantity }),
    adjustInventory: async (body: AdjustInventoryBody) => {
      const existing = body.sku === 'TEST-001' ? item : null;
      if (!existing) throw Object.assign(new Error('Not found'), { statusCode: 404 });
      return { ...existing, quantity: existing.quantity + body.quantityDelta };
    },
    deleteInventory: async (sku: string) => {
      if (sku !== 'TEST-001') throw Object.assign(new Error('Not found'), { statusCode: 404 });
    },
    ...overrides,
  };
}

describe('inventoryService', () => {
  it('syncInventory returns list from client', async () => {
    const client = createMockClient();
    const service = createInventoryService(client);
    const data = await service.syncInventory({ limit: 10, offset: 0 });
    assert(Array.isArray(data));
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].sku, 'TEST-001');
    assert.strictEqual(data[0].quantity, 10);
  });

  it('getBySku returns null for missing SKU', async () => {
    const service = createInventoryService(createMockClient());
    const result = await service.getBySku('MISSING');
    assert.strictEqual(result, null);
  });

  it('getBySku returns item for existing SKU', async () => {
    const service = createInventoryService(createMockClient());
    const result = await service.getBySku('TEST-001');
    assert.ok(result);
    assert.strictEqual(result!.sku, 'TEST-001');
  });

  it('adjustInventory rejects when result would be negative', async () => {
    const service = createInventoryService(createMockClient());
    await assert.rejects(
      async () =>
        service.adjustInventory({
          sku: 'TEST-001',
          quantityDelta: -100,
        }),
      (err: unknown) => {
        assert.ok(err instanceof MrpeasyError);
        assert.strictEqual(err.code, ErrorCodes.NEGATIVE_STOCK);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  it('adjustInventory returns updated item with correct quantity', async () => {
    const service = createInventoryService(createMockClient());
    const data = await service.adjustInventory({
      sku: 'TEST-001',
      quantityDelta: 5,
    });
    assert.strictEqual(data.sku, 'TEST-001');
    assert.strictEqual(data.quantity, 15);
  });

  it('adjustInventory throws NOT_FOUND for missing SKU', async () => {
    const client = createMockClient({
      getInventoryBySku: async () => null,
      adjustInventory: async () => {
        throw Object.assign(new Error('Not found'), { statusCode: 404 });
      },
    });
    const service = createInventoryService(client);
    await assert.rejects(
      async () => service.adjustInventory({ sku: 'MISSING', quantityDelta: 1 }),
      (err: unknown) => {
        assert.ok(err instanceof MrpeasyError);
        assert.strictEqual(err.code, ErrorCodes.NOT_FOUND);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  it('patchInventory rejects negative quantity', async () => {
    const service = createInventoryService(createMockClient());
    await assert.rejects(
      async () => service.patchInventory('TEST-001', { quantity: -1 }),
      (err: unknown) => {
        assert.ok(err instanceof MrpeasyError);
        assert.strictEqual(err.code, ErrorCodes.NEGATIVE_STOCK);
        return true;
      }
    );
  });

  it('patchInventory returns updated item on success', async () => {
    const service = createInventoryService(createMockClient());
    const data = await service.patchInventory('TEST-001', { quantity: 20 });
    assert.strictEqual(data.sku, 'TEST-001');
    assert.strictEqual(data.quantity, 20);
  });

  it('deleteInventory succeeds for existing SKU', async () => {
    const service = createInventoryService(createMockClient());
    await assert.doesNotReject(async () => service.deleteInventory('TEST-001'));
  });

  it('deleteInventory throws NOT_FOUND for missing SKU', async () => {
    const client = createMockClient({
      getInventoryBySku: async () => null,
    });
    const service = createInventoryService(client);
    await assert.rejects(
      async () => service.deleteInventory('MISSING'),
      (err: unknown) => {
        assert.ok(err instanceof MrpeasyError);
        assert.strictEqual(err.code, ErrorCodes.NOT_FOUND);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  it('getTotalInventoryCost uses MRPeasy basePrice correctly', async () => {
    const client = createMockClient({
      getInventory: async () => [
        { sku: 'TEST-001', quantity: 10, basePrice: 12 },
        { sku: 'TEST-002', quantity: 3, basePrice: 20 },
      ],
    });
    const service = createInventoryService(client);
    const summary = await service.getTotalInventoryCost();
    assert.strictEqual(summary.totalInventoryCost, 180);
    assert.strictEqual(summary.itemCount, 2);
    assert.strictEqual(summary.pricedItemCount, 2);
  });

  it('getTotalInventoryCost sums all current inventory rows', async () => {
    const client = createMockClient({
      getInventory: async () => [
        { sku: 'TEST-001', quantity: 2, basePrice: 10 },
        { sku: 'TEST-002', quantity: 5, basePrice: 8 },
      ],
    });
    const service = createInventoryService(client);
    const summary = await service.getTotalInventoryCost();
    assert.strictEqual(summary.totalInventoryCost, 60);
    assert.strictEqual(summary.itemCount, 2);
    assert.strictEqual(summary.pricedItemCount, 2);
  });
});
