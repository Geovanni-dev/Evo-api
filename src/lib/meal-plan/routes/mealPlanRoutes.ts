import { Router } from 'express';
import {
  indexMealPlan,
  updateMealPlan,
  storeMealPlan,
} from '../controller/mealPlanController.js';
import { authMiddlewareUser } from '../../middlewares/requireAuth.js';

const router = Router();

router.use(authMiddlewareUser);

router.get('/active', indexMealPlan);

router.put('/', updateMealPlan);

router.post('/generate', storeMealPlan);

export default router;
