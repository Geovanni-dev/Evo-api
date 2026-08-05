import { Router } from 'express';
import { update, index } from '../controller/nutritionGoalsController.js';

const router = Router();

router.put('/', update);

router.get('/', index);

export default router;
