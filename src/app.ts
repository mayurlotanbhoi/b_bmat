import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from 'dotenv';
// import admin from "firebase-admin";
import cors from 'cors'
import path from 'path';
import morgan from "morgan";
import { fileURLToPath } from 'url';
// import serviceAccount from "./firebase/serviceAccountKey.json" with { type: "json" };
import { errorHandler } from "./middleware/errorHandler.js";

// Load environment variables from the .env file


const app = express();

// Middleware setup (correct order)
app.use(express.json({ limit: '16kb' })); // ✅ Parse JSON body correctly
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser('yourSecretKey'));
app.use(cors({ origin: ['https://bmat.onrender.com', 'http://localhost:5173'], credentials: true }));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

dotenv.config();


// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from /public
app.use('public', express.static(path.join(__dirname, '../uploads')));


// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: shut down server gracefully
  process.exit(1);
});

import { router as authRoutes } from './routes/auth.routes.js';
import notificationRoutes from './routes/notifications.js';
import matrimony from "./routes/matrimony.routes.js";
import cookieParser from "cookie-parser";
import user from "./routes/user.routes.js";



app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/matrimony', matrimony);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', user);





// Global error handler (keep it last)
app.use(errorHandler);

app.get('/', async (req, res) => {
  res.json({ success: true, message: 'Route not found' });
})

export default app;
