import express from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOtp);

router.post('/2fa/setup', authController.setup2FA);
router.post('/2fa/enable', authController.enable2FA);
router.post('/2fa/disable', authController.disable2FA);
router.post('/2fa/verify-login', authController.verifyLogin2FA);

router.post('/logout', authController.logout);
router.post('/refresh-session', authController.refreshSession);
router.post('/select-rol', authController.selectRol);
router.get('/session-config', authController.getSessionConfig);

export default router;
