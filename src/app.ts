import express, { Request, Response } from "express";
import dotenv from 'dotenv';
// import admin from "firebase-admin";
import cors from 'cors'
import path from 'path';
import morgan from "morgan";
import { fileURLToPath } from 'url';
import admin from "firebase-admin";
import cookieParser from "cookie-parser";

import compression from "compression"; // ✅ Response compression
// import serviceAccount from "./firebase/serviceAccountKey.json" with { type: "json" };
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();



// Compression: gzip responses (HTML, JSON, images if possible)
app.use(compression());

// Middleware setup (correct order)
app.use(express.json({ limit: '16kb' })); //Parse JSON body correctly
app.use(cookieParser('yourSecretKey'));
app.use(express.urlencoded({ extended: true }));


// app.use(
//   '/uploads',
//   express.static(path.join(__dirname, '../public/uploads'), {
//     setHeaders: (res, filePath) => {
//       if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
//         res.setHeader("Cache-Control", "public, max-age=31536000");
//         res.setHeader('Content-Disposition', 'attachment; filename="' + path.basename(filePath) + '"');
//       }

//       const origin = res.req.headers.origin;
//       const allowedOrigins = [
//         'https://bhoi.joodi.in',
//         'https://bmat.onrender.com',
//         'http://localhost:5173',
//         'http://localhost:5174'
//       ];
//       // @ts-ignore
//       if (allowedOrigins.includes(origin)) {
//         // @ts-ignore
//         res.setHeader('Access-Control-Allow-Origin', origin);
//       }
//     },
//   })
// );


app.use(
  "/uploads",
  express.static(path.join(__dirname, "../public/uploads"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      res.setHeader("Access-Control-Allow-Headers", "*");
    },
  })
);
app.use(cors({
  origin: ['https://master.d1eeod4cq6ddmu.amplifyapp.com', 'https://bhoi.joodi.in', 'http://localhost:5173', 'http://localhost:5174', 'https://5173-mayurlotanbhoi-fbmat-uaiurd3o9t9.ws-us120.gitpod.io'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: shut down server gracefully
  process.exit(1);
});

import { router as authRoutes } from './routes/auth.routes.js';
import notificationRoutes from './routes/notifications.js';
import matrimony from "./routes/matrimony.routes.js";
import user from "./routes/user.routes.js";
import biodata from "./routes/biodata.routes.js";
import locatation from "./routes/location.routes.js";

// admin
import adminMatrimony from "./routes/admin/usermatri.routes.js";



app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/matrimony', matrimony);
app.use('/api/v1/location', locatation);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/biodata', biodata)
app.use('/api/v1/user', user);


// admin admin

app.use('/api/v1/admin', adminMatrimony);



// Global error handler (keep it last)
app.use(errorHandler);

app.get('/health', async (req, res) => {
  res.status(200).json({ success: true, message: 'Route is healthy' });
})

app.get('/', async (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
})


export default app;
