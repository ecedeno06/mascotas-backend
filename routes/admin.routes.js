import express from 'express';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

router.post('/admin/mascotas', adminController.createMascota);
router.patch('/admin/mascotas/:codigo_qr', adminController.updateMascota);

export default router;
