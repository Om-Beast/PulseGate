import { Router } from 'express';
import { listUsers, getUser, addUser } from '../controllers/userController';

const router = Router();

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', addUser);

export default router;
