import express from 'express';
import { createProfile, deleteProfile, getAllProfiles, getProfileById, getProfileByUserId, getSmartMatches, searchProfiles, updateProfile } from '../controllers/matrimony.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadAndCompressImages } from '../middleware/uploadAndCompress.middleware.js';


const router = express.Router();


router.get('/me', authMiddleware, getProfileByUserId);
router.get('/match', authMiddleware, getSmartMatches);
router.post('/create', authMiddleware, uploadAndCompressImages, createProfile);
router.post('/filter', authMiddleware, getAllProfiles);
router.get('/search', authMiddleware, searchProfiles);
router.get('/:id', authMiddleware, getProfileById);
router.put('/update/:id', authMiddleware, uploadAndCompressImages, updateProfile);
router.delete('/:id', authMiddleware, deleteProfile);

export default router;
