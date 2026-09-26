import { Router } from 'express';

import {
  indexPref,
  updatePref,
  indexRest,
  updateRest,
} from '../controller/preferencesController.js';
import { authMiddlewareUser } from '../../middlewares/requireAuth.js';

const router = Router();

router.use(authMiddlewareUser);

router.get('/', indexPref);

router.patch('/', updatePref);

router.get('/restrictions', indexRest);

router.patch('/restrictions', updateRest);

export default router;
