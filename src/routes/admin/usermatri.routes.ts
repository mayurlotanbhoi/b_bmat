// routes/biodata.routes.js
import express from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { activateAndVerifyProfile, getMatrimonyProfiles } from '../../controllers/admin/userMatri.coltrollesr.js';



const router = express.Router();

// FIXED ORDER: specific routes first
router.get('/matrimony',  getMatrimonyProfiles);
router.put('/activateAndVerifyProfile', activateAndVerifyProfile);

// keep dynamic route at the bottom
// router.get('/:id', authMiddleware, getBioData);
// router.post('/share', authMiddleware, shareBiodata);

export default router;
