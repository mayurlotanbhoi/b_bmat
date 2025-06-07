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

dotenv.config();

// Google OAuth client initialization
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper functions for generating JWT tokens
const generateToken = (userId: any, secret: string, expiresIn: string) => {
  const expiresInNumber = parseInt(expiresIn, 10);
  return sign({ userId }, secret, { expiresIn: expiresInNumber });
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

const regresToken = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies[process.env.COOKIE_NAME!];
  const userId = await verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
  const accessToken = generateToken(userId, process.env.JWT_SECRET!, process.env.JWT_ACCESS_EXPIRATION!);
  res.cookie(process.env.COOKIE_NAME!, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // must be true on HTTPS
    sameSite: 'lax', // <--- REQUIRED for cross-site cookie sending
    maxAge: Number(process.env.COOKIE_MAX_AGE),
    path: process.env.COOKIE_PATH!,
  });
  res.status(200).json(new ApiResponse(200, {}));
})

// User Registration (email + password)
const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send(new ApiResponse(400, null, 'Email and password are required'));
  }

  try {
    // Ensure that you have a createUser method in the UserModel
    const user = await UserModel.createUserWithPhone(email, password);
    console.log(user);
    // If `user` is an array, extract the first element
    // const newUser = user[0]; 
    res.status(201).json(new ApiResponse(201, { userId: user?._id }, 'User registered successfully'));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(new ApiResponse(500, null, 'Registration failed'));
  }
};

// User Login (email + password)
const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Ensure that you have a findUserByEmail method in UserModel
    const user = await UserModel.findUserByEmail(email);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Ensure that you have a validatePassword method in UserModel
    const passwordIsValid = await UserModel.validatePassword(user.password, password);
    if (!passwordIsValid) {
      throw new ApiError(401, 'Invalid Credentials');

    }

    const accessToken = generateToken(user._id, process.env.JWT_SECRET!, process.env.JWT_ACCESS_EXPIRATION!);
    const refreshToken = generateToken(user._id, process.env.JWT_REFRESH_SECRET!, process.env.JWT_REFRESH_EXPIRATION!);

    res.cookie(process.env.COOKIE_NAME!, refreshToken, {
      httpOnly: true,
      maxAge: Number(process.env.COOKIE_MAX_AGE),
      path: process.env.COOKIE_PATH!,
    });


    res.status(200).json(new ApiResponse(200, { accessToken, refreshToken }, 'Login successful'));
  } catch (error) {
    console.error('Login error:', error);
    throw new ApiError(401, 'Login failed');
  }
};

// Logout
const logout = async (req: Request, res: Response) => {
  res.clearCookie(process.env.COOKIE_NAME!);
  res.status(200).json(new ApiResponse(200, null, 'Logout successful'));
};

export { googleLogin, register, login, logout };
