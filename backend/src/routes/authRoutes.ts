import { Router } from 'express';
import { login, register, walletChallenge } from '../controllers/authController';

const router = Router();

// Route autentikasi (register, login).
router.post('/auth/wallet/challenge', walletChallenge);
router.post('/auth/register', register);
router.post('/auth/login', login);

export default router;
