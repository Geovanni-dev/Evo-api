import Routes from 'express';

import { storeChat } from '../controller/chatController.js';
import { authMiddlewareUser } from '../../middlewares/requireAuth.js';

const router = Routes.Router();

router.post('/chat', authMiddlewareUser, storeChat);

export default router;
