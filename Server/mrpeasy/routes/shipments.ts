import express from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { listShipments, getShipmentById } from '../controllers/shipmentsController';

const router = express.Router();

router.use(authenticate);
router.use(requirePermission('mrpeasy.view'));

router.get('/', listShipments);
router.get('/:id', getShipmentById);

export default router;
