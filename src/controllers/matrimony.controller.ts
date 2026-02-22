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
import stringSimilarity from 'string-similarity';
import { notificationService } from '../services/index.js';
import deepMerge from '../utils/deepMerge.js';
interface CustomRequest extends Request {
    loginUser?: any; // or define the type of loginUser
}

// Create Profile
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
            title: '"📩 नया बायोडाटा प्राप्त हुआ!"',
            body: 'आपको एक नया प्रोफ़ाइल मिला है जो आपकी प्राथमिकताओं से मेल खाता है।',
            url: `/view-profile/${profile._id}`,
            click_action: `/view-profile/${profile._id}`,
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

//  Get Profile by ID
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
        { 'profileStatus': 'Active' },
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

    // matchConditions['profileStatus'] = 'Active';

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

// Update Profile
export const updateProfile = asyncHandler(async (req: CustomRequest, res: Response) => {




    // Parse nested fields from dot-notation
    const profile = parseDotNotation(req.body);

    const { _id } = req.loginUser;
    const { id } = req.params;

    // Get existing profile
    const existingProfile = await matrimonyProfileModel.findUserByUserId(_id);
    if (!existingProfile) {
        throw new ApiError(404, 'Profile not found');
    }


    // Safely update profilePhotos using imageIndexes
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

    //  Handle verification image
    if (req.body?.compressedVerificationImage?.fileName) {
        profile.verificationImage = req.body?.compressedVerificationImage?.fileName;
    }

    //  Attach userId
    profile.userId = _id;


    //  Validate updated fields only
    await validatePartialProfile(profile);

    //  Clean up fields that should not be updated
    delete profile?.imageIndexes;
    delete profile?.compressedImages;
    delete profile?.compressedVerificationImage;

    console.log('profile?.contactDetails', profile?.contactDetails);
    console.log('existingProfile.contactDetails', existingProfile.contactDetails);
    const mergedContactDetails = {
        mobileNo: profile?.contactDetails?.mobileNo ?? existingProfile.contactDetails?.mobileNo,
        whatsappNo: profile?.contactDetails?.whatsappNo ?? existingProfile.contactDetails?.whatsappNo,
        email: profile?.contactDetails?.email ?? existingProfile.contactDetails?.email,

        presentAddress: {
            area: profile?.contactDetails?.presentAddress?.area ?? existingProfile.contactDetails?.presentAddress?.area,
            city: profile?.contactDetails?.presentAddress?.city ?? existingProfile.contactDetails?.presentAddress?.city,
            state: profile?.contactDetails?.presentAddress?.state ?? existingProfile.contactDetails?.presentAddress?.state,
            pinCode: profile?.contactDetails?.presentAddress?.pinCode ?? existingProfile.contactDetails?.presentAddress?.pinCode,
            country: profile?.contactDetails?.presentAddress?.country ?? existingProfile.contactDetails?.presentAddress?.country ?? "India",
        },

        permanentAddress: {
            area: profile?.contactDetails?.permanentAddress?.area ?? existingProfile.contactDetails?.permanentAddress?.area,
            city: profile?.contactDetails?.permanentAddress?.city ?? existingProfile.contactDetails?.permanentAddress?.city,
            state: profile?.contactDetails?.permanentAddress?.state ?? existingProfile.contactDetails?.permanentAddress?.state,
            pinCode: profile?.contactDetails?.permanentAddress?.pinCode ?? existingProfile.contactDetails?.permanentAddress?.pinCode,
            country: profile?.contactDetails?.permanentAddress?.country ?? existingProfile.contactDetails?.permanentAddress?.country ?? "India",
        },
    };
    //  Perform partial update
    const updatedProfile = await matrimonyProfileModel.findByIdAndUpdate(
        id,
        {
            $set: {
                professionalDetails: deepMerge(existingProfile.professionalDetails, profile?.professionalDetails),
                personalDetails: deepMerge(existingProfile.personalDetails, profile?.personalDetails),
                religiousDetails: deepMerge(existingProfile.religiousDetails, profile?.religiousDetails),
                familyDetails: deepMerge(existingProfile.familyDetails, profile?.familyDetails),
                educationDetails: deepMerge(existingProfile.educationDetails, profile?.educationDetails),
                expectation: deepMerge(existingProfile.expectation, profile?.expectation),
                contactDetails: mergedContactDetails, // ✅ use manually merged version
                lifestyleDetails: deepMerge(existingProfile.lifestyleDetails, profile?.lifestyleDetails),
                profilePhotos: profile?.profilePhotos || existingProfile.profilePhotos || [],
                verificationImage: profile?.verificationImage || existingProfile?.verificationImage,
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
export const getAllProfiles = asyncHandler(async (req: CustomRequest, res: Response) => {
    const {
        page = 1,
        limit = 10,
        ...filters
    } = req.body;

    const { longitude, latitude } = req.loginUser?.coordinates || {};

    const currentPage = Number(page);
    const perPage = Number(limit);
    const skip = (currentPage - 1) * perPage;

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
        jobType: 'professionalDetails.jobType',
        candidateTypes: 'candidateTypes'
    };

    const filter: Record<string, any> = {};

    filter['profileStatus'] = 'Active';

    for (const key in filters) {
        const rawValue = filters[key];
        if (!rawValue) continue;

        // Special handling for ageRange
        if (key === 'ageRange' && typeof rawValue === 'string' && rawValue.includes('-')) {
            const [minAge, maxAge] = rawValue.split('-').map(Number);
            if (!isNaN(minAge) && !isNaN(maxAge)) {
                const today = new Date();
                const minDOB = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
                const maxDOB = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
                filter['personalDetails.dateOfBirth'] = { $gte: minDOB, $lte: maxDOB };
            }
            continue;
        }

        // Special handling for heightRange (string match, e.g. "5ft1in-5ft5in")
        if (key === 'heightRange' && typeof rawValue === 'string' && rawValue.includes('-')) {
            // Use regex to match height range string
            filter['personalDetails.height'] = { $regex: rawValue, $options: 'i' };
            continue;
        }

        // Special handling for array fields (education, occupation, jobType)
        if ((key === 'education' || key === 'occupation' || key === 'jobType') && Array.isArray(rawValue)) {
            if (rawValue.length > 0) {
                filter[fieldMap[key]] = { $in: rawValue };
            }
            // If array is empty, skip adding filter for this field
            continue;
        }
        const value = Array.isArray(rawValue) ? rawValue : String(rawValue).trim();
        if (value === '') continue;
        if (key === 'candidateTypes') {
            const val = String(value).toLowerCase();
            if (val === 'bride') filter['personalDetails.gender'] = 'female';
            else if (val === 'groom') filter['personalDetails.gender'] = 'male';
            else if (val === 'divorcee') filter['personalDetails.maritalStatus'] = 'divorced';
            else if (val === 'widow') filter['personalDetails.maritalStatus'] = 'widow';
            else if (val === 'nearby' && latitude && longitude) {
                const radiusInDegrees = 1; // ~55 km; adjust as needed

                filter['lat'] = { $gte: latitude - radiusInDegrees, $lte: latitude + radiusInDegrees };
                filter['lon'] = { $gte: longitude - radiusInDegrees, $lte: longitude + radiusInDegrees };
            }
            else if (val === '10-12') {
                filter['educationDetails.highestQualification'] = {
                    $in: ["Below 10th", "10th Pass", "12th Pass", "Diploma", "ITI"]
                };
            }
        } else if (key === 'income' && !isNaN(Number(value))) {
            // Only filter where income is numeric
            filter.$expr = {
                $and: [
                    { $regexMatch: { input: "$professionalDetails.income", regex: "^[0-9]+(\\.[0-9]+)?$" } },
                    { $gte: [{ $toDouble: "$professionalDetails.income" }, Number(value)] }
                ]
            };
        } else if (fieldMap[key]) {
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    filter[fieldMap[key]] = { $in: value };
                }
                // If array is empty, skip adding filter for this field
            } else {
                filter[fieldMap[key]] = { $regex: value, $options: 'i' };
            }
        }
    }

    console.log('Filter conditions:', filter);

    const [totalResults, profiles] = await Promise.all([
        matrimonyProfileModel.countDocuments(filter),
        matrimonyProfileModel.find(filter).skip(skip).limit(perPage).lean()
    ]);

    // console.log('Total results:', profiles);

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



export const getSmartMatches = asyncHandler(async (req: CustomRequest, res: Response) => {
    console.log('req.body', req.loginUser._id);
    const user = await matrimonyProfileModel.findOne({ userId: req.loginUser._id });

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const expectation = user?.expectation;
    const genderToMatch = user.personalDetails.gender === 'Male' ? 'Female' : 'Male';

    const allProfiles = await matrimonyProfileModel.find({
        _id: { $ne: user._id },
        'personalDetails.gender': genderToMatch,
        'profileStatus': 'Active'
    });

    const getAge = (dob: any) => new Date().getFullYear() - new Date(dob).getFullYear();

    const matches = allProfiles.map((profile) => {
        let score = 0;

        // 🎯 Match Education (using similarity)
        if (expectation?.education?.length) {
            const bestMatch = stringSimilarity.findBestMatch(
                profile.educationDetails.highestQualification || '',
                expectation.education
            );
            if (bestMatch.bestMatch.rating > 0.6) score += 15;
        }

        // 🎯 Match Occupation (using similarity)
        if (expectation?.occupation?.length) {
            const bestMatch = stringSimilarity.findBestMatch(
                profile.professionalDetails.occupation || '',
                expectation.occupation
            );
            if (bestMatch.bestMatch.rating > 0.6) score += 15;
        }

        // 🎯 Religion
        if (
            expectation?.religion &&
            expectation.religion !== 'NA' &&
            stringSimilarity.compareTwoStrings(
                profile.religiousDetails.religion || '',
                expectation.religion
            ) > 0.6
        ) score += 10;

        // 🎯 Caste
        if (
            expectation?.caste &&
            expectation.caste !== 'NA' &&
            stringSimilarity.compareTwoStrings(
                profile.religiousDetails.caste || '',
                expectation.caste
            ) > 0.6
        ) score += 10;

        // 🎯 Manglik
        if (profile.religiousDetails.manglik === user.religiousDetails.manglik) score += 5;

        // 🎯 Eating Habits
        if (profile.lifestyleDetails.eatingHabits === user.lifestyleDetails.eatingHabits) score += 3;

        // 🎯 Age proximity ±5
        const userAge = getAge(user.personalDetails.dateOfBirth);
        const otherAge = getAge(profile.personalDetails.dateOfBirth);
        if (Math.abs(userAge - otherAge) <= 5) score += 10;

        // 🎯 Location match (City)
        if (
            expectation?.locationPreference &&
            expectation.locationPreference !== 'NA' &&
            stringSimilarity.compareTwoStrings(
                profile.contactDetails.presentAddress.city || '',
                expectation.locationPreference
            ) > 0.6
        ) score += 5;

        return { profile, score };
    });

    const topMatches = matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((m) => m.profile);

    res.status(200).json({
        success: true,
        data: topMatches,
        message: 'Top 10 daily matches',
    });
});

