// /src/routes/authRoutes.ts
import express from 'express';

import { asyncHandler } from '../middleware/asyncHandler.js';
import { getLocation, updateInitialdetails } from '../controllers/location.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const router = express.Router();

router.get('/get-location', authMiddleware, getLocation);
router.post('/update-initial-details', authMiddleware, updateInitialdetails);


export default router;
