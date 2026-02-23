import { z } from 'zod';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, DEFAULT_LOW_STOCK_THRESHOLD } from '../constants';

export const skuParamSchema = z.object({
  sku: z.string().min(1, 'SKU is required').trim(),
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional().default(DEFAULT_PAGE_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().int().min(0).optional().default(DEFAULT_LOW_STOCK_THRESHOLD),
});

export const patchBodySchema = z.object({
  quantity: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  reorderQty: z.number().int().min(0).optional(),
  name: z.string().max(500).optional(),
  basePrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
}).strict();

export const adjustBodySchema = z.object({
  sku: z.string().min(1, 'SKU is required').trim(),
  quantityDelta: z.number().int(),
  reason: z.string().max(1000).optional(),
  idempotencyKey: z.string().max(256).optional(),
}).strict();

export type SkuParam = z.infer<typeof skuParamSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type LowStockQuery = z.infer<typeof lowStockQuerySchema>;
export type PatchBody = z.infer<typeof patchBodySchema>;
export type AdjustBody = z.infer<typeof adjustBodySchema>;
