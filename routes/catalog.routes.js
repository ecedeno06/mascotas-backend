import express from 'express';
import * as catalogController from '../controllers/catalog.controller.js';

const router = express.Router();

router.get('/api/catalogo-razas', catalogController.getCatalogoRazas);
router.get('/catalogo-razas', catalogController.getCatalogoRazas);

router.get('/api/catalogo-especies', catalogController.getCatalogoEspecies);
router.get('/catalogo-especies', catalogController.getCatalogoEspecies);

export default router;
