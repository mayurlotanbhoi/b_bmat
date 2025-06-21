import { Request, Response } from 'express';
import { profileValidationSchema, validatePartialProfile } from '../validation/profile.validation.js';
import { matrimonyProfileModel } from '../models/matrimony.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../middleware/ApiResponse.js';
import { ApiError } from '../middleware/ApiError.js';
import { parseDotNotation } from '../utils/parseDotNotation.js';
import { Types } from 'mongoose';
import UserModel from '../models/user.model.js';
import { sendNotification } from '../routes/notifications.js';
import { notificationService } from '../services/index.js';
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

    const newGender = newProfile.personalDetails.gender;
    const oppositeGender = newGender === 'Male' ? 'Female' : 'Male';

    // Find opposite gender profiles with maritalStatus = Divorcee or Widow
    const matchedProfiles = await matrimonyProfileModel.find({
        'personalDetails.gender': oppositeGender,
        'personalDetails.maritalStatus': { $in: ['Divorced', 'Widow'] },
    }).select('userId');

    // Extract userIds
    const userIds = matchedProfiles.map(profile => profile.userId);

    // Get FCM tokens for those users
    const usersWithFcm = await UserModel.find({ _id: { $in: userIds } }).select('fcmTokens');

    // Extract all tokens into a flat array
    const tokens: string[] = usersWithFcm.flatMap(user => user.fcmTokens || []);

    // if (allTokens.length === 0) return;

    // Send notification to all matching users
    // for (const token of allTokens) {


    if (tokens.length !== 0) {

        const payload = {
            tokens,
            title: 'New Profile Alert!',
            body: 'A new profile matching your preferences has been added.',
            url: '/matrimony/search',
            click_action: '/matrimony/search',
            imageUrl: profile?.profilePhotos[0], // Optional: Add image path if you want a thumbnail
        }
        await notificationService.send(payload);
        // await sendNotification({
        //     tokens,
        //     title: 'New Profile Alert!',
        //     body: 'A new profile matching your preferences has been added.',
        //     url: '/matrimony/search',
        //     click_action: '/matrimony/search',
        //     imageUrl: profile?.profilePhotos[0], // Optional: Add image path if you want a thumbnail
        // });
    }

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



export const searchProfiles = asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
        throw new ApiError(400, 'Search query is required');
    }

    const regexQuery = new RegExp(query, 'i');
    const isValidObjectId = Types.ObjectId.isValid(query);

    const matchConditions = [
        { 'personalDetails.fullName': regexQuery },
        { 'contactDetails.mobileNo': regexQuery },
        { 'contactDetails.whatsappNo': regexQuery },
        { 'contactDetails.email': regexQuery },
        { 'familyDetails.fatherName': regexQuery },
        { 'familyDetails.motherName': regexQuery },
        { 'religiousDetails.religion': regexQuery },
        { 'religiousDetails.caste': regexQuery },
        { 'religiousDetails.subCaste': regexQuery },
        { 'educationDetails.highestQualification': regexQuery },
        { 'professionalDetails.occupation': regexQuery },
        { 'professionalDetails.companyName': regexQuery },
        { 'professionalDetails.workingCity': regexQuery },
        { 'contactDetails.presentAddress.city': regexQuery },
        { 'contactDetails.presentAddress.area': regexQuery },
    ];

    // if (isValidObjectId) {
    //     matchConditions.push(
    //         { _id: new Types.ObjectId(query) },
    //         { userId: new Types.ObjectId(query) }
    //     );
    // }

    const results = await matrimonyProfileModel.aggregate([
        { $match: { $or: matchConditions } },
        {
            $project: {
                profilePhotos: { $slice: ['$profilePhotos', 1] }, // Only first image
                'personalDetails.dateOfBirth': 1,
                'personalDetails.fullName': 1,
                'contactDetails.presentAddress.city': 1,
                'religiousDetails.caste': 1,
                'religiousDetails.subCaste': 1,
            }
        },
        { $limit: 20 }
    ]);

    res.status(200).json(new ApiResponse(200, results, 'Search Results'));
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

    console.log('req.body.compressedImages', req?.body?.compressedImages);

    // ✅ Safely update profilePhotos using imageIndexes
    if ((Array.isArray(profile?.imageIndexes) || profile?.imageIndexes === '0') || Array.isArray(req.body.compressedImages)) {
        // Ensure profilePhotos is initialized
        if (!Array.isArray(profile?.profilePhotos)) {
            profile.profilePhotos = [...(existingProfile?.profilePhotos || [])];
        }

        for (let i = 0; i < profile?.imageIndexes?.length; i++) {
            const imageIndex = Number(profile?.imageIndexes[i]);
            const fileName = req.body.compressedImages[i]?.fileName;

            if (!isNaN(imageIndex) && fileName) {
                profile.profilePhotos[imageIndex] = fileName;
            }
        }
    }

    // ✅ Handle verification image
    if (req.body?.compressedVerificationImage?.fileName) {
        profile.verificationImage = req.body?.compressedVerificationImage?.fileName;
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
export const getAllProfiles = asyncHandler(async (req: Request, res: Response) => {

    console.log('req.body', req.body);
    const {
        page = 1,
        limit = 10,
        ...filters
    } = req.body;
    console.log('filters', req.body);

    const currentPage = Number(page);
    const perPage = Number(limit);

    const fieldMap: Record<string, string> = {
        email: 'contactDetails.email',
        mobileNo: 'contactDetails.mobileNo',
        whatsappNo: 'contactDetails.whatsappNo',
        city: 'contactDetails.presentAddress.city',
        state: 'contactDetails.presentAddress.state',
        gender: 'personalDetails.gender',
        maritalStatus: 'personalDetails.maritalStatus',
        caste: 'religiousDetails.caste',
        subCaste: 'religiousDetails.subCaste',
        manglik: 'religiousDetails.manglik',
        occupation: 'professionalDetails.occupation',
        income: 'professionalDetails.income',
        height: 'personalDetails.height',
        education: 'educationDetails.highestQualification',
        candidateTypes: 'candidateTypes' // special handling
    };

    const filter: Record<string, any> = {};

    for (const key in filters) {
        const value = filters[key];
        if (!value) continue;

        if (key === 'candidateTypes') {
            const val = (value as string).toLowerCase();
            if (val === 'bride') filter['personalDetails.gender'] = 'Female';
            else if (val === 'groom') filter['personalDetails.gender'] = 'Male';
            else if (val === 'divorced') filter['personalDetails.maritalStatus'] = 'Divorced';
            else if (val === 'widow') filter['personalDetails.maritalStatus'] = 'Widow';
        } else if (fieldMap[key]) {
            filter[fieldMap[key]] = { $regex: value, $options: 'i' };
        }
    }

    const skip = (currentPage - 1) * perPage;

    const [totalResults, profiles] = await Promise.all([
        matrimonyProfileModel.countDocuments(filter),
        matrimonyProfileModel.find(filter).skip(skip).limit(perPage)
    ]);

    const totalPages = Math.ceil(totalResults / perPage);

    res.status(200).json(new ApiResponse(200, {
        data: profiles,
        totalResults,
        totalPages,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
        nextPage: currentPage < totalPages ? currentPage + 1 : null,
        previousPage: currentPage > 1 ? currentPage - 1 : null
    }, 'Filtered profiles fetched successfully'));
});
