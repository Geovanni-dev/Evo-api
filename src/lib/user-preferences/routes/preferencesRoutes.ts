import Routes from 'express'; // Import the Routes class from the Express library

import {
  indexPref,
  updatePref,
  indexRest,
  updateRest,
} from '../controller/preferencesController.js'; // Import the preferencesController

const router = Routes.Router(); // Create a new instance of the Routes class

router.get('/preferences', indexPref); // Define a GET route for retrieving all preferences, protected by authentication middleware

router.patch('/preferences', updatePref); // Define a PATCH route for updating a preference, protected by authentication middleware

router.get('/restrictions', indexRest); // Define a GET route for retrieving all restrictions, protected by authentication middleware

router.patch('/restrictions', updateRest); // Define a PATCH route for updating a restriction, protected by authentication middleware

export default router; // Export the router
