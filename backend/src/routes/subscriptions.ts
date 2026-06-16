import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getSubscriptions,
  subscribe,
  unsubscribe,
} from '../controllers/subscriptionController';

const router = Router();

router.use(authenticate);
router.get('/', getSubscriptions);
router.post('/', subscribe);
router.delete('/:ticker', unsubscribe);

export default router;
