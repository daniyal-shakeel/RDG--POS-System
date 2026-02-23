import type { IMrpeasyClient } from './mrpeasyClient';
import type { InventoryItem, InventoryListParams, AdjustInventoryBody, InventoryCostSummary } from '../types';
import { MrpeasyError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import Product from '../../models/Product';
import ProductVariant from '../../models/ProductVariant';

export interface InventoryServiceContext {
  userId?: string;
}

export function createInventoryService(client: IMrpeasyClient) {
  async function getAllInventory(): Promise<InventoryItem[]> {
    const pageSize = 200;
    let offset = 0;
    const rows: InventoryItem[] = [];

    while (true) {
      const page = await client.getInventory({ limit: pageSize, offset });
      rows.push(...page);
      if (page.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    return rows;
  }

  return {

    async syncInventory(params?: InventoryListParams, _ctx?: InventoryServiceContext): Promise<InventoryItem[]> {
      const list = await client.getInventory(params);
      return list;
    },

    async getBySku(sku: string): Promise<InventoryItem | null> {
      return client.getInventoryBySku(sku);
    },

    async getLowStock(threshold?: number): Promise<InventoryItem[]> {
      return client.getLowStock(threshold);
    },

    async patchInventory(
      sku: string,
      body: Partial<InventoryItem>,
      ctx?: InventoryServiceContext
    ): Promise<InventoryItem> {
      const existing = await client.getInventoryBySku(sku);
      if (!existing) {
        throw new MrpeasyError(`Inventory item not found: ${sku}`, ErrorCodes.NOT_FOUND, 404);
      }

      if (typeof body.quantity === 'number' && body.quantity < 0) {
        throw new MrpeasyError('Quantity cannot be negative', ErrorCodes.NEGATIVE_STOCK, 400);
      }

      const updated = await client.patchInventory(sku, body);

      logger.audit({
        sku,
        operation: 'patch',
        userId: ctx?.userId,
        previousQty: existing.quantity,
        newQty: updated.quantity,
      });

      return updated;
    },

    async adjustInventory(
      body: AdjustInventoryBody,
      ctx?: InventoryServiceContext
    ): Promise<InventoryItem> {
      const existing = await client.getInventoryBySku(body.sku);
      if (!existing) {
        throw new MrpeasyError(`Inventory item not found: ${body.sku}`, ErrorCodes.NOT_FOUND, 404);
      }

      const newQty = existing.quantity + body.quantityDelta;
      if (newQty < 0) {
        throw new MrpeasyError(
          `Adjustment would result in negative stock (current: ${existing.quantity}, delta: ${body.quantityDelta})`,
          ErrorCodes.NEGATIVE_STOCK,
          400
        );
      }

      const updated = await client.adjustInventory(body);

      logger.audit({
        sku: body.sku,
        operation: 'adjust',
        userId: ctx?.userId,
        previousQty: existing.quantity,
        newQty: updated.quantity,
        delta: body.quantityDelta,
        reason: body.reason,
      });

      return updated;
    },

    async deleteInventory(sku: string, ctx?: InventoryServiceContext): Promise<void> {
      const existing = await client.getInventoryBySku(sku);
      if (!existing) {
        throw new MrpeasyError(`Inventory item not found: ${sku}`, ErrorCodes.NOT_FOUND, 404);
      }

      await client.deleteInventory(sku);

      logger.audit({
        sku,
        operation: 'delete',
        userId: ctx?.userId,
        previousQty: existing.quantity,
      });
    },

    async getTotalInventoryCost(): Promise<InventoryCostSummary> {
      const filteredItems = await getAllInventory();

      let totalInventoryCost = 0;
      let pricedItemCount = 0;
      const missingPriceSkus = new Set<string>();

      for (const item of filteredItems) {
        if (typeof item.basePrice !== 'number') {
          missingPriceSkus.add(item.sku);
          continue;
        }
        totalInventoryCost += item.quantity * item.basePrice;
        pricedItemCount += 1;
      }

      if (missingPriceSkus.size > 0) {
        const [products, variants] = await Promise.all([
          Product.find({ sku: { $in: Array.from(missingPriceSkus) } }).select('sku costPrice').lean(),
          ProductVariant.find({ sku: { $in: Array.from(missingPriceSkus) } }).select('sku costPrice').lean(),
        ]);

        const fallbackCostBySku = new Map<string, number>();
        for (const row of products) {
          if (typeof row?.sku === 'string' && typeof row?.costPrice === 'number') {
            fallbackCostBySku.set(row.sku, row.costPrice);
          }
        }
        for (const row of variants) {
          if (typeof row?.sku === 'string' && typeof row?.costPrice === 'number') {
            fallbackCostBySku.set(row.sku, row.costPrice);
          }
        }

        for (const item of filteredItems) {
          if (typeof item.basePrice === 'number') {
            continue;
          }
          const fallbackCost = fallbackCostBySku.get(item.sku);
          if (typeof fallbackCost !== 'number') {
            continue;
          }
          totalInventoryCost += item.quantity * fallbackCost;
          pricedItemCount += 1;
        }
      }

      return {
        totalInventoryCost,
        itemCount: filteredItems.length,
        pricedItemCount,
      };
    },
  };
}

export type InventoryService = ReturnType<typeof createInventoryService>;
