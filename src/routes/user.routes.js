import express from 'express';
import * as userController from '../controllers/user.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', userController.getUsers);
router.get('/:email', userController.getUserByEmail);
router.put('/:email', userController.updateUser);
router.delete('/:email', userController.deleteUser);

export default router;
