import Routes from 'express';

import { storeChat } from '../controller/chatController.js';

const router = Routes.Router();

router.post('/chat', storeChat);

export default router;
