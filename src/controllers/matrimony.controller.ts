import { Request, Response } from 'express';
import { profileValidationSchema } from '../validation/profile.validation.js';
import { matrimonyProfileModel } from '../models/matrimony.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../middleware/ApiResponse.js';
import { ApiError } from '../middleware/ApiError.js';
import { parseDotNotation } from '../utils/parseDotNotation.js';
interface CustomRequest extends Request {
    loginUser?: any; // or define the type of loginUser
}

// ✅ Create Profile
export const createProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
    // const profile = req.body;
    const profile = parseDotNotation(req.body);
    console.log(profile);
    const { _id } = req?.loginUser;
    profile.userId = _id;
    const validatedProfile = await profileValidationSchema.validate(profile, { abortEarly: false });

    console.log(validatedProfile);

    const isMatPresent = await matrimonyProfileModel.findUserByUserId(_id);
    if (isMatPresent) {
        throw new ApiError(400, 'Profile already exists');
    }

    const newProfile = matrimonyProfileModel.createMatrimonyProfile(validatedProfile);
    res
        .status(201)
        .json(new ApiResponse(201, { newProfile }, 'Profile registered successfully'));
});

// ✅ Get Profile by ID
export const getProfileById = asyncHandler(async (req: Request, res: Response) => {
    const profile = await matrimonyProfileModel.findById(req.params.id);
    if (!profile) {
        throw new ApiError(404, 'Profile not found');
    }

    res.status(200).json(new ApiResponse(200, profile));
});

// ✅ Update Profile
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    await profileValidationSchema.validate(req.body, { abortEarly: false });

    const profile = await matrimonyProfileModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!profile) {
        throw new ApiError(404, 'Profile not found');
    }

    res.status(200).json(new ApiResponse(200, profile, 'Profile updated successfully'));
});

// ✅ Delete Profile
export const deleteProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await matrimonyProfileModel.findByIdAndDelete(req.params.id);
    if (!profile) {
        throw new ApiError(404, 'Profile not found');
    }

    res.status(200).json(new ApiResponse(200, {}, 'Profile deleted successfully'));
});

// ✅ Get All Profiles
export const getAllProfiles = asyncHandler(async (_req: Request, res: Response) => {
    const profiles = await matrimonyProfileModel.find();
    res.status(200).json(new ApiResponse(200, profiles));
});