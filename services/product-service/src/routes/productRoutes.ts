import { Router } from 'express';
import { listProducts, getProduct, addProduct } from '../controllers/productController';

const router = Router();

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', addProduct);

export default router;
