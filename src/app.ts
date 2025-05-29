import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from 'dotenv';
import admin from "firebase-admin";
import cors from 'cors'
import notificationRoutes from './routes/notifications.js';
// import serviceAccount from "./firebase/serviceAccountKey.json" with { type: "json" };
import { errorHandler } from "./middleware/errorHandler.js";

// Load environment variables from the .env file


const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
dotenv.config();




const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: shut down server gracefully
  process.exit(1);
});

import { router as authRoutes } from './routes/auth.routes.js';


app.use('/api/v1/', notificationRoutes);
app.use('/api/v1/auth', authRoutes);





// Global error handler (keep it last)
app.use(errorHandler);

export default app;
