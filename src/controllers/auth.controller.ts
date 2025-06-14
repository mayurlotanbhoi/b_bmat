// /src/controllers/authController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
const { sign, verify } = jwt;
import dotenv from 'dotenv';
import { OAuth2Client, TokenPayload } from 'google-auth-library'; // Import Google OAuth2 Client
import { ApiResponse } from '../middleware/ApiResponse.js'; // Assuming this is in your middleware folder
import { UserModel } from '../models/user.model.js'; // Make sure this path is correct
import { ApiError } from '../middleware/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import bcrypt from 'bcryptjs';
import { notificationService } from '../services/index.js';

dotenv.config();

// Google OAuth client initialization
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper functions for generating JWT tokens
const generateToken = (userId: any, secret: string, expiresIn: string) => {
  const expiresInNumber = parseInt(expiresIn, 10);
  return sign({ userId }, secret, { expiresIn: 36000 });
};

// Google Login
const googleLogin = async (req: Request, res: Response) => {
  const { token } = req.body;
  try {
    // Google OAuth2 token verification logic
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // Ensure that you set the correct Google Client ID in .env
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(400).send(new ApiResponse(400, null, 'Invalid token'));

    if (!payload || !payload.email || !payload.email_verified) {
      throw new Error("Invalid or unverified Google token.");
    }

    const {
      email = '',
      name = '',
      picture = '',
    }: Partial<Pick<TokenPayload, 'email' | 'name' | 'picture'>> = payload;

    // Check if user exists
    let user = await UserModel.findUserByEmail(email);
    if (!user) {
      // If the user doesn't exist, create one
      user = await UserModel.createUserWithGoogle(email, name, picture);
    } else {
      console.log(user);
      user?.loginMethodHistory?.push({ method: 'google', timestamp: new Date() });
      await user.save();
    }

    const userId = user._id;
    const accessToken = generateToken(userId, process.env.JWT_SECRET!, process.env.JWT_ACCESS_EXPIRATION!);
    const refreshToken = generateToken(userId, process.env.JWT_REFRESH_SECRET!, process.env.JWT_REFRESH_EXPIRATION!);


    user = await UserModel.updateRefreshAndAccessToken(userId, refreshToken, accessToken);

    res.cookie(process.env.COOKIE_NAME!, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // must be true on HTTPS
      sameSite: 'lax', // <--- REQUIRED for cross-site cookie sending
      maxAge: Number(process.env.COOKIE_MAX_AGE),
      path: process.env.COOKIE_PATH!,
    });

    // res.cookie(process.env.COOKIE_NAME!, refreshToken, {
    //   httpOnly: true,
    //   sameSite: 'lax',
    //   maxAge: Number(process.env.COOKIE_MAX_AGE),
    //   path: process.env.COOKIE_PATH!,
    // });

    res.status(200).json(new ApiResponse(200, { user, accessToken }, 'Login successful'));
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json(new ApiResponse(500, null, 'Google login failed'));
  }
};

const refreshToken = async (req: Request, res: Response) => {
  const tokenFromCookie = req.cookies?.[process.env.COOKIE_NAME!];
  const tokenFromHeader = req.headers?.authorization?.split(' ')[1];
  const accessToken = tokenFromCookie || tokenFromHeader;

  try {
    if (!accessToken) {
      throw new ApiError(401, 'Access token not found');
    }

    // Find user by access token
    const user = await UserModel.findOne({ accessToken }).select('name userRole mobile email profilePicture language accessToken refreshToken');

    if (!user || !user.refreshToken) {
      throw new ApiError(403, 'Refresh token not found');
    }


    // Verify the refresh token
    const decoded = verify(user.refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };

    console.log(' refresed token decoded', decoded);

    // Generate new access token
    const newAccessToken = generateToken(decoded.userId, process.env.JWT_SECRET!, process.env.JWT_ACCESS_EXPIRATION!);

    // Set new access token in cookie
    res.cookie(process.env.COOKIE_NAME!, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Number(process.env.COOKIE_MAX_AGE),
      path: process.env.COOKIE_PATH!,
    });

    res.status(200).json(new ApiResponse(200, { user, accessToken: newAccessToken }, 'refresed token'));
    // res.status(200).json(new ApiResponse(200, { accessToken: newAccessToken }));
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
}

// User Registration (email + password)
const register = async (req: Request, res: Response) => {

  const { mobile, password } = req.body as { mobile?: string; password?: string };

  // Validate input
  if (!mobile?.trim() || !password?.trim()) {
    return res.status(400).json(
      new ApiResponse(400, null, 'Mobile and password are required')
    );
  }

  // Check if user already exists
  const existingUser = await UserModel.findUserByEmail(mobile);
  if (existingUser) {
    return res.status(409).json(
      new ApiResponse(409, null, 'User already exists')
    );
  }

  // Optional: Hash the password before saving


  // Create and save new user
  const newUser = await UserModel.createUserWithPhone(mobile, password);

  return res.status(201).json(
    new ApiResponse(201, newUser, 'User registered successfully')
  );

};

// User Login (email + password)
const login = async (req: Request, res: Response) => {
  const { mobile, password } = req.body;
  console.log(mobile, password);


  // Ensure that you have a findUserByEmail method in UserModel
  const user = await UserModel.findOne({ mobile });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  console.log("user", user?.password, password);

  // Ensure that you have a validatePassword method in UserModel
  const passwordIsValid = await UserModel.validatePassword(user.password, password);
  console.log(passwordIsValid, 'passwordIsValid');
  if (!passwordIsValid) {
    throw new ApiError(404, 'Invalid Credentials');
  }

  const userId = user._id;
  const accessToken = generateToken(userId, process.env.JWT_SECRET!, process.env.JWT_ACCESS_EXPIRATION!);
  const refreshToken = generateToken(userId, process.env.JWT_REFRESH_SECRET!, process.env.JWT_REFRESH_EXPIRATION!);


  const newUser = await UserModel.updateRefreshAndAccessToken(userId, refreshToken, accessToken);

  const payload = {
    tokens: newUser.fcmTokens, // Array of FCM tokens (e.g. [user.fcmToken])
    title: '✅ Login Successful!',
    body: 'You have successfully logged into your account.',
    url: '/dashboard', // Redirect to your dashboard or home page
    click_action: '/dashboard',
    imageUrl: 'https://cdn.wallpapersafari.com/31/77/634LSi.jpg', // Optional: show a login-related image if available
  };
  await notificationService.send(payload);

  res.cookie(process.env.COOKIE_NAME!, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // must be true on HTTPS
    sameSite: 'lax', // <--- REQUIRED for cross-site cookie sending
    maxAge: Number(process.env.COOKIE_MAX_AGE),
    path: process.env.COOKIE_PATH!,
  });



  res.status(200).json(new ApiResponse(200, { user: newUser, accessToken }, 'Login successful'));

};

// Logout
const logout = async (req: Request, res: Response) => {
  res.clearCookie(process.env.COOKIE_NAME!);
  res.status(200).json(new ApiResponse(200, null, 'Logout successful'));
};

export { googleLogin, refreshToken, register, login, logout };
