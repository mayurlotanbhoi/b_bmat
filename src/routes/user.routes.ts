import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getUser, updateUser } from '../controllers/user.controller.js';
import { uploadAndCompressImages } from '../middleware/uploadAndCompress.middleware.js';


const router = express.Router();

router.get('/get/me', authMiddleware, getUser);
router.put('/update/me', authMiddleware, uploadAndCompressImages, updateUser);

// router.get('/', authMiddleware, getAllProfiles);
// router.get('/me', authMiddleware, getProfileByUserId);

// router.get('/:id', authMiddleware, getProfileById);
// router.delete('/:id', authMiddleware, deleteProfile);

export default router;
