import express from 'express';
import * as userController from '../controllers/user.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/*
        router.use(authMiddleware);

        router.get('/listaUsuarios', userController.getUsers);
        router.post('/crearUsuario', userController.createUser);
        router.get('/obtenerUsuario/:email', userController.getUserByEmail);
        router.put('/actualizarUsuario/:email', userController.updateUser);
        router.delete('/eliminarUsuario/:email', userController.deleteUser);

*/

router.get('/listaUsuarios', userController.getUsers);
router.post('/crearUsuario', authMiddleware, userController.createUser);
router.get('/obtenerUsuario/:email', authMiddleware, userController.getUserByEmail);
router.put('/actualizarUsuario/:email', authMiddleware, userController.updateUser);
router.delete('/eliminarUsuario/:email', authMiddleware, userController.deleteUser);

export default router;
