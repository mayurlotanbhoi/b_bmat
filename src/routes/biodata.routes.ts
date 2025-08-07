// routes/biodata.routes.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { shareBiodata, getSharedBiodatas, markBiodataViewed, getBioData } from '../controllers/biodata.controller.js';


const router = express.Router();

// FIXED ORDER: specific routes first
router.get('/shared', authMiddleware, getSharedBiodatas);
router.get('/view/:id', authMiddleware, markBiodataViewed);

// keep dynamic route at the bottom
router.get('/:id', getBioData);
router.post('/share', authMiddleware, shareBiodata);

export default router;
