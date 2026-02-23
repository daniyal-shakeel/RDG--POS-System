import type { IMrpeasyClient } from './mrpeasyClient';
import type { ShipmentDocument, ShipmentListParams } from '../types';

export interface ShipmentsServiceContext {
  userId?: string;
}

export function createShipmentsService(client: IMrpeasyClient) {
  return {
    async listShipments(
      params?: ShipmentListParams,
      _ctx?: ShipmentsServiceContext
    ): Promise<ShipmentDocument[]> {
      return client.getShipments(params);
    },

    async getShipmentById(id: string, _ctx?: ShipmentsServiceContext): Promise<ShipmentDocument | null> {
      return client.getShipmentById(id);
    },
  };
}

export type ShipmentsService = ReturnType<typeof createShipmentsService>;
