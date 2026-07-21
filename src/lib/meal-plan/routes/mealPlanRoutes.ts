import { Router } from 'express'; // Import the Router class from the Express library
import {
  indexMealPlan,
  updateMealPlan,
} from '../controller/mealPlanController.js'; // Import the mealPlanController
const router = Router(); // Create a new instance of the Router class

router.get('/active', indexMealPlan); // Define a GET route for retrieving a meal plan, protected by authentication middleware

router.put('/', updateMealPlan); // Define a PUT route for updating a meal plan, protected by authentication middleware

export default router; // Export the router
