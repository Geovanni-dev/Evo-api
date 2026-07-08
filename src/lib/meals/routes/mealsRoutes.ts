import { Router } from 'express'; // Import the Router class from the Express library
import mealsController from '../controllers/mealsController.js'; // Import the mealsController

const router = Router(); // Create a new instance of the Router class

router.post('/', mealsController.store); // Define a POST route for creating a meal, protected by authentication middleware

router.get('/daily', mealsController.index); // Define a GET route for retrieving all meals, protected by authentication middleware

router.delete('/daily/:mealId/:itemId', mealsController.destroyItem); // Define a DELETE route for deleting a meal item, protected by authentication middleware

router.get('/daily/:mealType', mealsController.show); // Define a GET route for retrieving a specific meal by type, protected by authentication middleware

router.put('/daily/:mealId', mealsController.update); // Define a PUT route for updating a meal, protected by authentication middleware

router.delete('/daily/:mealId', mealsController.destroy); // Define a DELETE route for deleting a meal, protected by authentication middleware

export default router; // Export the router
