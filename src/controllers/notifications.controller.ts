import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../middleware/ApiResponse.js';
import { ApiError } from '../middleware/ApiError.js';
import { UserModel } from '../models/user.model.js'; // Make sure this path is correct
import { CustomRequest } from '../types/express/index.js';
import { matrimonyProfileModel } from '../models/matrimony.model.js';
import { notificationService } from '../services/index.js';




export const sendProfileVeiwedNotification = asyncHandler(async (req: CustomRequest, res: Response) => {
    const viewerUserId = req.loginUser._id;
    const { profileId: profileOwnerUserId } = req.query;

    const viewerProfile = await matrimonyProfileModel.findOne({ userId: viewerUserId });
    if (!viewerProfile) throw new ApiError(404, 'Viewer profile not found');

    const ownerProfile = await matrimonyProfileModel.findOne({ userId: profileOwnerUserId });
    if (!ownerProfile) throw new ApiError(404, 'Profile being viewed not found');

    const ownerUser = await UserModel.findById(ownerProfile.userId);
    if (!ownerUser) throw new ApiError(404, 'Profile owner user not found');

    // Notify owner if they have FCM tokens
    // @ts-ignore
    if (ownerUser?.fcmTokens?.length > 0) {
        await notificationService.send({
            tokens: ownerUser.fcmTokens,
            title: `👀 ${viewerProfile.personalDetails?.fullName || 'a user'} viewed your biodata!`,
            body: `Your profile was viewed by ${viewerProfile.personalDetails?.fullName || 'a user'}.`,
            url: `/matrimony/view-profile/${viewerProfile._id}`,
            click_action: `/matrimony/view-profile/${viewerProfile._id}`,
            imageUrl: viewerProfile.profilePhotos?.[0] || '',
        });
    }

})


