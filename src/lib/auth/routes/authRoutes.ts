import { Router } from 'express';
import {
  googleLogin,
  logout,
  refreshLogin,
} from '../controller/authController.js';
import { authMiddlewareUser } from '../../middlewares/requireAuth.js';

const router = Router();

router.post('/google', googleLogin);
router.post('/refresh', refreshLogin);
router.post('/logout', authMiddlewareUser, logout);

export default router;
