import { z } from 'zod';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../constants';

const dateString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'must be a valid date string');

export const shipmentListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional().default(DEFAULT_PAGE_LIMIT),
    offset: z.coerce.number().int().min(0).optional().default(0),
    status: z.string().trim().min(1).max(100).optional(),
    fromDate: dateString.optional(),
    toDate: dateString.optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (!data.fromDate || !data.toDate) return true;
      return Date.parse(data.fromDate) <= Date.parse(data.toDate);
    },
    {
      message: 'fromDate must be before or equal to toDate',
      path: ['fromDate'],
    }
  );

export type ShipmentListQuery = z.infer<typeof shipmentListQuerySchema>;

export const shipmentIdParamSchema = z.object({
  id: z.string().min(1, 'Shipment ID is required').trim(),
});

export type ShipmentIdParam = z.infer<typeof shipmentIdParamSchema>;
