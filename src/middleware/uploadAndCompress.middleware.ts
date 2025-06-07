import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import { fileURLToPath } from 'url';

// Get __filename and __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const UPLOAD_DIR = path.join(__dirname, '../../public/uploads/images');
const COMPRESSED_DIR = path.join(UPLOAD_DIR, 'compressed');

// Ensure folders exist
[UPLOAD_DIR, COMPRESSED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer temp storage for original upload
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, fileName);
    },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
        cb(new Error('Only JPEG, PNG, WEBP images are allowed'));
    } else {
        cb(null, true);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).fields([
    { name: 'images', maxCount: 3 },
    { name: 'verificationImage', maxCount: 1 }
]);

export const convertFilePathToPublicUrl = (filePath: string, domain: string): string => {
    const normalized = filePath.replace(/\\/g, '/');
    const idx = normalized.indexOf('/uploads/');
    if (idx === -1) return '';

    return `${domain}/uploads${normalized.substring(idx + '/uploads'.length)}`;
};


export const uploadAndCompressImages = (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, async (err) => {
        //@ts-ignore
        console.log('req.files', req.files);
        if (err) return res.status(400).json({ success: false, message: err.message });

        try {
            //@ts-ignore
            const images = req.files?.['images'] as Express.Multer.File[] || [];
            //@ts-ignore
            const verificationImages = req.files?.['verificationImage'] as Express.Multer.File[] || [];
            const compressedImages = [];

            for (const file of images) {
                const ext = path.extname(file.originalname).toLowerCase();
                const compressedFileName = `compressed-${file.filename.replace(ext, '.webp')}`;
                const compressedPath = path.join(COMPRESSED_DIR, compressedFileName);

                await sharp(file.path)
                    .resize(1024, null, { fit: 'inside' })
                    .webp({ quality: 80 })
                    .toFile(compressedPath);

                fs.unlinkSync(file.path);

                compressedImages.push({
                    originalName: file.originalname,
                    fileName: convertFilePathToPublicUrl(compressedPath, process.env.DOMAIN_NAME || 'default-domain.com'),
                    path: compressedPath,
                });
            }

            // If you want to compress verificationImage too
            let compressedVerificationImage = null;
            if (verificationImages.length > 0) {
                const vFile = verificationImages[0];
                const ext = path.extname(vFile.originalname).toLowerCase();
                const compressedFileName = `compressed-${vFile.filename.replace(ext, '.webp')}`;
                const compressedPath = path.join(COMPRESSED_DIR, compressedFileName);

                await sharp(vFile.path)
                    .resize(1024, null, { fit: 'inside' })
                    .webp({ quality: 80 })
                    .toFile(compressedPath);

                fs.unlinkSync(vFile.path);

                compressedVerificationImage = {
                    originalName: vFile.originalname,
                    fileName: convertFilePathToPublicUrl(compressedPath, process.env.DOMAIN_NAME || 'default-domain.com'), // or compressedFileName,
                    path: compressedPath,
                };
            }

            req.body.compressedImages = compressedImages;
            if (compressedVerificationImage) {
                req.body.compressedVerificationImage = compressedVerificationImage;
            }

            next();
        } catch (error: any) {
            console.error('Compression error:', error);
            res.status(500).json({ success: false, message: 'Image compression failed' });
        }
    });
};

