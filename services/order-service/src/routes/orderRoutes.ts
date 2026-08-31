import { Router } from 'express';
import { listOrders, getOrder, addOrder } from '../controllers/orderController';

const router = Router();

router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/', addOrder);

export default router;
