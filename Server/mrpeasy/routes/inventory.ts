import express from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import {
  listInventory,
  getInventoryBySku,
  getLowStock,
  getInventorySum,
  patchInventory,
  adjustInventory,
  deleteInventory,
} from '../controllers/inventoryController';

const router = express.Router();

router.use(authenticate);
router.use(requirePermission('mrpeasy.view'));

router.get('/', listInventory);
router.get('/low-stock', getLowStock);
router.get('/sum', getInventorySum);
router.get('/:sku', getInventoryBySku);
router.patch('/:sku', requirePermission('mrpeasy.manage'), patchInventory);
router.delete('/:sku', requirePermission('mrpeasy.manage'), deleteInventory);
router.post('/adjust', requirePermission('mrpeasy.manage'), adjustInventory);

export default router;
