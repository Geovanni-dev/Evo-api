import { Router } from 'express'; // Import the Router class from the Express library
import mealsController from '../controllers/mealsController.js'; // Import the mealsController

const router = Router(); // Create a new instance of the Router class

router.post('/meals', mealsController.store); // Define a POST route for creating a meal, protected by authentication middleware

export default router; // Export the router
