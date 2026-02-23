import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createMrpeasyClient } from '../services/mrpeasyClient';
import { createShipmentsService } from '../services/shipmentsService';
import { shipmentListQuerySchema, shipmentIdParamSchema } from '../validators/shipments';
import { toStatusCode, toSafeMessage, toErrorCode } from '../lib/errors';
import { ErrorCodes } from '../lib/errors';

const client = createMrpeasyClient();
const shipmentsService = createShipmentsService(client);

function ctx(req: AuthRequest): { userId?: string } {
  return { userId: req.user?.userId ?? req.user?.email };
}

export async function listShipments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = shipmentListQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query',
        code: ErrorCodes.VALIDATION,
        details: query.error.flatten(),
      });
      return;
    }

    const data = await shipmentsService.listShipments(query.data, ctx(req));
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

export async function getShipmentById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const params = shipmentIdParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid shipment id',
        code: ErrorCodes.VALIDATION,
        details: params.error.flatten(),
      });
      return;
    }

    const data = await shipmentsService.getShipmentById(params.data.id, ctx(req));
    if (!data) {
      res.status(404).json({
        success: false,
        error: `Shipment not found: ${params.data.id}`,
        code: ErrorCodes.NOT_FOUND,
      });
      return;
    }

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
