import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getUser } from '../controllers/user.controller.js';


const router = express.Router();

router.get('/get/me', authMiddleware, getUser);

// router.get('/', authMiddleware, getAllProfiles);
// router.get('/me', authMiddleware, getProfileByUserId);

// router.get('/:id', authMiddleware, getProfileById);
// router.put('/update/:id', authMiddleware, uploadAndCompressImages, updateProfile);
// router.delete('/:id', authMiddleware, deleteProfile);

export default router;
