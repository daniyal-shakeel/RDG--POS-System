import { Router } from 'express';
import inventoryRoutes from './routes/inventory';
import shipmentsRoutes from './routes/shipments';

export { mrpeasyConfig } from './config';

const router = Router();
router.use('/inventory', inventoryRoutes);
router.use('/shipments', shipmentsRoutes);

export default router;
