import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createMrpeasyClient } from '../services/mrpeasyClient';
import { createInventoryService } from '../services/inventoryService';
import {
  listQuerySchema,
  lowStockQuerySchema,
  skuParamSchema,
  patchBodySchema,
  adjustBodySchema,
} from '../validators/inventory';
import { toStatusCode, toSafeMessage, toErrorCode } from '../lib/errors';
import { ErrorCodes } from '../lib/errors';

const client = createMrpeasyClient();
const inventoryService = createInventoryService(client);

function ctx(req: AuthRequest): { userId?: string } {
  return { userId: req.user?.userId ?? req.user?.email };
}

export async function listInventory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = listQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query',
        code: ErrorCodes.VALIDATION,
        details: query.error.flatten(),
      });
      return;
    }
    const data = await inventoryService.syncInventory(
      { limit: query.data.limit, offset: query.data.offset },
      ctx(req)
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    const status = toStatusCode(err);
    res.status(status).json({
      success: false,
      error: toSafeMessage(err),
      code: toErrorCode(err),
    });
  }
}

export async function getInventoryBySku(req: AuthRequest, res: Response): Promise<void> {
  try {
    const params = skuParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid SKU',
        code: ErrorCodes.VALIDATION,
        details: params.error.flatten(),
      });
      return;
    }
    const item = await inventoryService.getBySku(params.data.sku);
    if (!item) {
      res.status(404).json({
        success: false,
        error: `Inventory item not found: ${params.data.sku}`,
        code: ErrorCodes.NOT_FOUND,
      });
      return;
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    const status = toStatusCode(err);
    res.status(status).json({
      success: false,
      error: toSafeMessage(err),
      code: toErrorCode(err),
    });
  }
}

export async function getLowStock(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = lowStockQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query',
        code: ErrorCodes.VALIDATION,
        details: query.error.flatten(),
      });
      return;
    }
    const data = await inventoryService.getLowStock(query.data.threshold);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const status = toStatusCode(err);
    res.status(status).json({
      success: false,
      error: toSafeMessage(err),
      code: toErrorCode(err),
    });
  }
}

export async function getInventorySum(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await inventoryService.getTotalInventoryCost();
    res.status(200).json({ success: true, data });
  } catch (err) {
    const status = toStatusCode(err);
    res.status(status).json({
      success: false,
      error: toSafeMessage(err),
      code: toErrorCode(err),
    });
  }
}

export async function patchInventory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const params = skuParamSchema.safeParse(req.params);
    const body = patchBodySchema.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid SKU',
        code: ErrorCodes.VALIDATION,
        details: params.error.flatten(),
      });
      return;
    }
    if (!body.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid body',
        code: ErrorCodes.VALIDATION,
        details: body.error.flatten(),
      });
      return;
    }
    const data = await inventoryService.patchInventory(params.data.sku, body.data, ctx(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    const status = toStatusCode(err);
    res.status(status).json({
      success: false,
      error: toSafeMessage(err),
      code: toErrorCode(err),
    });
  }
}

export async function adjustInventory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = adjustBodySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid body',
        code: ErrorCodes.VALIDATION,
        details: body.error.flatten(),
      });
      return;
    }
    const data = await inventoryService.adjustInventory(body.data, ctx(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    const status = toStatusCode(err);
    res.status(status).json({
      success: false,
      error: toSafeMessage(err),
      code: toErrorCode(err),
    });
  }
}

export async function deleteInventory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const params = skuParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid SKU',
        code: ErrorCodes.VALIDATION,
        details: params.error.flatten(),
      });
      return;
    }

    await inventoryService.deleteInventory(params.data.sku, ctx(req));
    res.status(200).json({ success: true, data: { sku: params.data.sku, deleted: true } });
  } catch (err) {
    const status = toStatusCode(err);
    res.status(status).json({
      success: false,
      error: toSafeMessage(err),
      code: toErrorCode(err),
    });
  }
}