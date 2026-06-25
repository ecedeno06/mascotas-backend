import express from 'express';
import * as petController from '../controllers/pet.controller.js';

const router = express.Router();

router.get('/mascotas/buscar', petController.getBuscar);
router.get('/acceso-mascota/buscar', petController.getAccesoMascotaBuscar);
router.get('/acceso-mascota/:idmascota/informacion-compartida', petController.getAccesoMascotaInformacionCompartida);
router.get('/propietarios/:criterio/mascotas', petController.getPropietariosMascotas);
router.get('/veterinaria-mascotas/:veterinaria', petController.getVeterinariaMascotas);
router.get('/propietario-mascotas', petController.getPropietarioMascotas);

export default router;
