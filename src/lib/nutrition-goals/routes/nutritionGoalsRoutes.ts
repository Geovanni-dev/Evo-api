import { Router } from 'express'; // Import the Router class from the Express library
import nutritionGoalsController from '../controller/nutritionGoalsController.js'; // Import the nutritionGoalsController

const router = Router(); // Create a new instance of the Router class

router.put('/', nutritionGoalsController.update); // Define a POST route for creating or updating a nutrition goal, protected by authentication middleware

router.get('/', nutritionGoalsController.index); // Define a GET route for retrieving a nutrition goal, protected by authentication middleware

export default router; // Export the router
