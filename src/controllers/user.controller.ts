import { Request, Response } from 'express';
const { sign, verify } = jwt;
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../middleware/ApiResponse.js'; // Assuming this is in your middleware folder
import { UserModel } from '../models/user.model.js'; // Make sure this path is correct
import { ApiError } from '../middleware/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

interface CustomRequest extends Request {
    loginUser?: any; // or define the type of loginUser
}
export const getUser = async (req: CustomRequest, res: Response) => {
    const { _id } = req.loginUser;
    try {
        // Google OAuth2 token verification logic

        const user = await UserModel.findById(_id).select('name userRole address  mobile email profilePicture language');
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        const accessToken = sign({ userId: user._id }, process.env.JWT_SECRET!, {
            expiresIn: '1d',
        });

        res.status(200).json(new ApiResponse(200, { user, accessToken }, 'Login successful'));
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json(new ApiResponse(500, null, 'Google login failed'));
    }
};