import { Request, Response } from 'express';
import { profileValidationSchema, validatePartialProfile } from '../validation/profile.validation.js';
import { matrimonyProfileModel } from '../models/matrimony.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../middleware/ApiResponse.js';
import { ApiError } from '../middleware/ApiError.js';
import { parseDotNotation } from '../utils/parseDotNotation.js';
import e from 'cors';
interface CustomRequest extends Request {
    loginUser?: any; // or define the type of loginUser
}

// ✅ Create Profile
export const createProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
    // const profile = req.body;
    const profile = parseDotNotation(req.body);
    // console.log(profile);
    delete profile?.compressedImages;
    delete profile?.compressedVerificationImage;
    delete profile?.imageIndexes;
    const { _id } = req?.loginUser;
    profile['profilePhotos'] = req.body?.compressedImages?.map((p: any) => p.fileName);
    profile['verificationImage'] = req.body?.compressedVerificationImage?.fileName
    profile.userId = _id;
    // console.log('req.body?.compressedVerificationImage?.fileName', req.body?.compressedVerificationImage?.fileName);
    // console.log('req.body?.compressedImages?', req.body?.compressedImages);
    console.log("profile", profile);
    const validatedProfile = await profileValidationSchema.validate(profile, { abortEarly: false });

    // console.log(validatedProfile);

    const isMatPresent = await matrimonyProfileModel.findUserByUserId(_id);
    if (isMatPresent) {
        throw new ApiError(400, 'Profile already exists');
    }

    const newProfile = await matrimonyProfileModel.createMatrimonyProfile(validatedProfile);
    console.log(newProfile, 'newProfile');

    res
        .status(201)
        .json(new ApiResponse(201, newProfile, 'Profile registered successfully'));
});

// ✅ Get Profile by ID
export const getProfileById = asyncHandler(async (req: Request, res: Response) => {
    const profile = await matrimonyProfileModel.findById(req.params.id);
    if (!profile) {
        throw new ApiError(404, 'Profile not found');
    }
    res
        .status(200)
        .json(new ApiResponse(200, profile, 'Profile'));

});

export const getProfileByUserId = asyncHandler(async (req: CustomRequest, res: Response) => {
    const profile = await matrimonyProfileModel.findOne({ userId: req.loginUser._id })
    if (!profile) {
        throw new ApiError(404, 'Profile not found');
    }
    res.status(200)
        .json(new ApiResponse(200, profile, 'Profile'));
});

// ✅ Update Profile
export const updateProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
    console.log("Raw incoming data:", req.body);

    // Parse nested fields from dot-notation
    const profile = parseDotNotation(req.body);
    const { _id } = req.loginUser;
    const { id } = req.params;

    // Get existing profile
    const existingProfile = await matrimonyProfileModel.findUserByUserId(_id);
    if (!existingProfile) {
        throw new ApiError(404, 'Profile not found');
    }

    console.log('req.body.compressedImages', req.body.compressedImages);

    // ✅ Safely update profilePhotos using imageIndexes
    if ((Array.isArray(profile.imageIndexes) || profile.imageIndexes === '0') || Array.isArray(req.body.compressedImages)) {
        // Ensure profilePhotos is initialized
        if (!Array.isArray(profile.profilePhotos)) {
            profile.profilePhotos = [...(existingProfile.profilePhotos || [])];
        }

        for (let i = 0; i < profile.imageIndexes.length; i++) {
            const imageIndex = Number(profile.imageIndexes[i]);
            const fileName = req.body.compressedImages[i]?.fileName;

            if (!isNaN(imageIndex) && fileName) {
                profile.profilePhotos[imageIndex] = fileName;
            }
        }
    }

    // ✅ Handle verification image
    if (req.body?.compressedVerificationImage?.fileName) {
        profile.verificationImage = req.body.compressedVerificationImage.fileName;
    }

    // ✅ Attach userId
    profile.userId = _id;
    console.log('profile.profilePhotos', profile.profilePhotos);


    // ✅ Validate updated fields only
    await validatePartialProfile(profile);

    // ✅ Clean up fields that should not be updated
    delete profile?.imageIndexes;
    delete profile?.compressedImages;
    delete profile?.compressedVerificationImage;

    console.log('profile.profilePhotos', profile.profilePhotos);

    // ✅ Perform partial update
    const updatedProfile = await matrimonyProfileModel.findByIdAndUpdate(
        id,
        {
            $set: {
                professionalDetails: {
                    ...existingProfile.professionalDetails,
                    ...profile?.professionalDetails,
                },
                personalDetails: {
                    ...existingProfile.personalDetails,
                    ...profile?.personalDetails,
                },
                religiousDetails: {
                    ...existingProfile.religiousDetails,
                    ...profile?.religiousDetails,
                },
                familyDetails: {
                    ...existingProfile.familyDetails,
                    ...profile?.familyDetails,
                },
                educationDetails: {
                    ...existingProfile.educationDetails,
                    ...profile?.educationDetails,
                },
                contactDetails: {
                    ...existingProfile.contactDetails,
                    ...profile?.contactDetails,
                },
                lifestyleDetails: {
                    ...existingProfile.lifestyleDetails,
                    ...profile?.lifestyleDetails,
                },
                profilePhotos: [
                    ...profile?.profilePhotos || [],
                ],
                verificationImage: profile?.verificationImage || existingProfile?.verificationImage

            },
        },
        { new: true }
    );


    res.status(200).json(new ApiResponse(200, updatedProfile, 'Profile updated successfully'));
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