import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getAllPrices, getPrice } from '../controllers/stockController';

const router = Router();

router.use(authenticate);
router.get('/', getAllPrices);
router.get('/:ticker', getPrice);

export default router;
