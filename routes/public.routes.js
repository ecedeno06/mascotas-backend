import express from 'express';
import * as publicController from '../controllers/public.controller.js';
import { getQrImage } from '../controllers/admin.controller.js';

const router = express.Router();

router.get('/public/mascotas/qr/:codigo_qr', publicController.getPublicMascotaByQr);
router.post('/public/mascotas/qr/:codigo_qr/avistamiento', publicController.createAvistamiento);
router.get('/admin/mascotas/:codigo_qr/qr-image', getQrImage);

export default router;
