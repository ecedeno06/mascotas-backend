import express from 'express';
import * as systemController from '../controllers/system.controller.js';

const router = express.Router();

router.get('/health', systemController.getHealth);

export default router;
