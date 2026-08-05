import Routes from 'express';

import {
  indexPref,
  updatePref,
  indexRest,
  updateRest,
} from '../controller/preferencesController.js';

const router = Routes.Router();

router.get('/', indexPref);

router.patch('/', updatePref);

router.get('/restrictions', indexRest);

router.patch('/restrictions', updateRest);

export default router;
