import { Router } from 'express';
import {
  indexMealPlan,
  updateMealPlan,
  storeMealPlan,
} from '../controller/mealPlanController.js';
const router = Router();

router.get('/active', indexMealPlan);

router.put('/', updateMealPlan);

router.post('/generate', storeMealPlan);

export default router;
