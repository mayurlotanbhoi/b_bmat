import { ApiError } from "../../middleware/ApiError.js";
import { ApiResponse } from "../../middleware/ApiResponse.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { matrimonyProfileModel } from "../../models/matrimony.model.js";
import { Request, Response } from 'express';
import paginateQuery from "../../utils/pagination.js";
import UserModel from "../../models/user.model.js";
import { notificationService } from "../../services/index.js";



export const getMatrimonyProfiles = asyncHandler(async (req, res) => {
    const {
        page = 1,
        pageSize = 10,
        searchInput = '',
    } = req.query as Record<string, any>;

    console.log(searchInput,"searchInput")

    const currentPage = Number(page);
    const perPage = Number(pageSize);

    const searchRegex = new RegExp(searchInput.toString(), 'i');

    const filter = searchInput
        ? {
            $or: [
                { "personalDetails.fullName": searchRegex },
                { "personalDetails.gender": searchRegex },
                { "personalDetails.height": searchRegex },
                { "personalDetails.weight": searchRegex },
                { "personalDetails.maritalStatus": searchRegex },
                { "religiousDetails.religion": searchRegex },
                { "religiousDetails.caste": searchRegex },
                { "religiousDetails.subCaste": searchRegex },
                { "contactDetails.mobileNo": searchRegex },
                { "contactDetails.email": searchRegex },
                { "contactDetails.presentAddress.city": searchRegex },
                { "contactDetails.presentAddress.state": searchRegex },
                { "educationDetails.highestQualification": searchRegex },
                { "professionalDetails.occupation": searchRegex },
                { "professionalDetails.income": searchRegex },
                { "professionalDetails.workingCity": searchRegex },
            ],
        }
        : {};

    const { results, pagination } = await paginateQuery({
        model: matrimonyProfileModel,
        filter,
        page: currentPage,
        pageSize: perPage,
        sort: { createdAt: -1 },
        populate: 'userId',
    });

    if (!results.length) {
        throw new ApiError(404, 'No profiles found');
    }

    res.status(200).json(
        new ApiResponse(200, { data: results, pagination }, 'Profiles fetched successfully')
    );
});

export const activateAndVerifyProfile = asyncHandler(async (req: Request, res: Response) => {
    const { id, profileStatus, isVerified } = req.body;

    // 1. Fetch profile
    const profile = await matrimonyProfileModel.findById(id);
    if (!profile) throw new ApiError(404, 'Profile not found');

    // 2. Fetch user
    const user = await UserModel.findById(profile.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const oldProfileStatus = profile.profileStatus;
    const oldIsVerified = profile.isVerified;

    // 3. Update profile fields if values provided
    if (profileStatus) profile.profileStatus = profileStatus;
    if (typeof isVerified === 'boolean') profile.isVerified = isVerified;

    // await profile.save();

    // 4. Check for status changes and send notifications
    const notifications: { title: string; body: string }[] = [];

    if (oldProfileStatus !== profileStatus && profileStatus === 'active') {
        notifications.push({
            title: 'Profile Activated',
            body: 'Your profile is now active and visible to others.',
        });
    }

    if (oldIsVerified !== isVerified && isVerified === true) {
        notifications.push({
            title: 'Profile Verified',
            body: 'Congratulations! Your profile has been successfully verified.',
        });
    }

    // 5. Send notification if needed
    // @ts-ignore
    if (notifications.length > 0 && user?.fcmTokens?.length > 0) {
        for (const note of notifications) {
            const payload = {
                tokens: user.fcmTokens,
                title: note.title,
                body: note.body,
                url: 'https://bhoi.joodi.in',
                click_action: 'https://bhoi.joodi.in',
                imageUrl: profile.profilePhotos?.[0] || '',
            };
            await notificationService.send(payload);
        }
    }

    // 6. Send updated list of verified & active profiles
    const activeVerifiedProfiles = await matrimonyProfileModel.findByIdAndUpdate(
        profile._id,
        {
            $set: {
                profileStatus,
                isVerified,
            },
        },
        { new: true } 
    );

//@ts-ignore
    if (!activeVerifiedProfiles || activeVerifiedProfiles.length === 0) {
        throw new ApiError(404, 'No active and verified profiles found');
    }

    res
        .status(200)
        .json(new ApiResponse(200, activeVerifiedProfiles, 'Profile updated and notifications sent if needed'));
});


