import express from 'express';
import { createProfile, deleteProfile, getAllProfiles, getProfileById, updateProfile } from '../controllers/matrimony.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadAndCompressImages } from '../middleware/uploadAndCompress.middleware.js';


const router = express.Router();

router.post('/create', authMiddleware, uploadAndCompressImages, createProfile);
router.get('/', authMiddleware, getAllProfiles);
router.get('/:id', authMiddleware, getProfileById);
router.put('/:id', authMiddleware, uploadAndCompressImages, updateProfile);
router.delete('/:id', authMiddleware, deleteProfile);

export default router;
