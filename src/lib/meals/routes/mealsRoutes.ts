import { Router } from 'express';
import {
  store,
  index,
  show,
  update,
  destroy,
  destroyItem,
  indexMealSummary,
} from '../controller/mealsController.js';

const router = Router();

router.post('/', store);

router.get('/summary', indexMealSummary);

router.get('/daily', index);

router.delete('/daily/:mealId/:itemId', destroyItem);

router.get('/daily/:mealType', show);

router.put('/daily/:mealId', update);

router.delete('/daily/:mealId', destroy);

export default router;
