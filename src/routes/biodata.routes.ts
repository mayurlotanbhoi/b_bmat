// routes/biodata.routes.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { shareBiodata, getSharedBiodatas, markBiodataViewed, getBioData } from '../controllers/biodata.controller.js';


const router = express.Router();

router.get('/view/:id', authMiddleware, markBiodataViewed);
router.get('/:id', authMiddleware, getBioData);
router.post('/share', authMiddleware, shareBiodata);
router.get('/shared', authMiddleware, getSharedBiodatas);

export default router;
