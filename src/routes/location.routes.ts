// /src/routes/authRoutes.ts
import express from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { shareLocation } from '../controllers/location.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = express.Router();

router.get('/update-location', authMiddleware, shareLocation);


export default router;
