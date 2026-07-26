import { Router } from 'express'; // Import the Router class from the Express library
import {
  store,
  index,
  show,
  update,
  destroy,
  destroyItem,
  indexMealSummary,
} from '../controller/mealsController.js';

const router = Router(); // Create a new instance of the Router class

router.post('/', store); // Define a POST route for creating a meal, protected by authentication middleware

router.get('/summary', indexMealSummary); // Define a GET route for retrieving a meal summary, protected by authentication middleware

router.get('/daily', index); // Define a GET route for retrieving all meals, protected by authentication middleware

router.delete('/daily/:mealId/:itemId', destroyItem); // Define a DELETE route for deleting a meal item, protected by authentication middleware

router.get('/daily/:mealType', show); // Define a GET route for retrieving a specific meal by type, protected by authentication middleware

router.put('/daily/:mealId', update); // Define a PUT route for updating a meal, protected by authentication middleware

router.delete('/daily/:mealId', destroy); // Define a DELETE route for deleting a meal, protected by authentication middleware

export default router; // Export the router
