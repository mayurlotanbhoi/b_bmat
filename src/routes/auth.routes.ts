// /src/routes/authRoutes.ts
import express from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { googleLogin, login, logout, refreshToken, register } from '../controllers/auth.controller.js';


const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/google-login', asyncHandler(googleLogin));
router.post('/login', asyncHandler(login));
router.post('/logout', asyncHandler(logout));
router.post('/refresh-token', asyncHandler(refreshToken));

export { router };
