import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../middleware/ApiResponse.js';
import { ApiError } from '../middleware/ApiError.js';
import { UserModel } from '../models/user.model.js'; // Make sure this path is correct

import { notificationService } from '../services/index.js';
import { CustomRequest } from '../types/express/index.js';
import sharedBiodataModel from '../models/sharedBiodata.model.js';
import { matrimonyProfileModel } from '../models/matrimony.model.js';

// POST: Share a profile
export const shareBiodata = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { toUserId, profileId } = req.body;
    const fromUserId = req.loginUser._id;

    if (!toUserId || !profileId) {
        throw new ApiError(400, 'Missing toUserId or profileId');
    }

    // Fetch the profile that is being shared
    const profileToShare = await matrimonyProfileModel.findById(profileId);
    if (!profileToShare) {
        throw new ApiError(404, 'Profile to share not found');
    }

    // Fetch sender's own profile
    const senderProfile = await matrimonyProfileModel.findOne({ userId: fromUserId });
    if (!senderProfile) {
        throw new ApiError(404, 'Sender profile not found');
    }

    // Save the shared biodata record
    const shared = await sharedBiodataModel.create({
        fromUser: fromUserId,
        toUser: toUserId,
        profileShared: profileToShare._id,
    });

    // Notify the receiver if they have FCM tokens
    const receiver = await UserModel.findById(toUserId);
    //@ts-ignore
    if (receiver?.fcmTokens?.length > 0) {
        await notificationService.send({
            //@ts-ignore
            tokens: receiver?.fcmTokens,
            title: '📩 New Biodata Received!',
            body: `You have received a profile from ${senderProfile.personalDetails?.fullName || 'a user'}.`,
            url: `/matrimony/view-profile/${profileToShare._id}`,
            click_action: `/matrimony/view-profile/${profileToShare._id}`,
            imageUrl: profileToShare.profilePhotos?.[0],
        });
    }

    res.status(201).json(new ApiResponse(201, shared, 'Biodata shared successfully'));
});

// GET: Get sent/received biodatas
export const getSharedBiodatas = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.loginUser._id;

    if (!userId) {
        throw new ApiError(400, 'User not found in request');
    }

    // Fetch sent and received in parallel
    const [sent, received] = await Promise.all([
        sharedBiodataModel.find({ fromUser: userId })
            .populate('fromUser', 'mobile')
            .populate('toUser', 'mobile')
            .populate('profileShared')
            .sort({ updatedAt: -1, createdAt: -1 }),

        sharedBiodataModel.find({ toUser: userId })
            .populate('fromUser', 'mobile')
            .populate('toUser', 'mobile')
            .populate('profileShared')
            .sort({ updatedAt: -1, createdAt: -1 }),
    ]);


    res.status(200).json(
        new ApiResponse(200, { sent, received }, 'Shared biodatas fetched')
    );
});

// PATCH: Mark as viewed
export const markBiodataViewed = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const biodata = await sharedBiodataModel.findByIdAndUpdate(
        id,
        { isViewed: true, viewedAt: new Date() },
        { new: true }
    );

    if (!biodata) {
        throw new ApiError(404, 'Shared biodata not found');
    }

    res.status(200).json(new ApiResponse(200, biodata, 'Marked as viewed'));
});
