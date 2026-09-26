import { Router } from 'express';
import { update, index } from '../controller/nutritionGoalsController.js';
import { authMiddlewareUser } from '../../middlewares/requireAuth.js';

const router = Router();

router.use(authMiddlewareUser);

router.put('/', update);

router.get('/', index);

export default router;
