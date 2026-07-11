import Routes from 'express'; // Import the Routes class from the Express library

import { storeChat } from '../controller/aiController.js'; // Import the storeChat controller

const router = Routes.Router(); // Create a new instance of the Routes class

router.post('/chat', storeChat); // Define a POST route for storing chat messages

export default router; // Export the router
