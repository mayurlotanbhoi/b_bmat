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



    // Fetch sender's profile details
    const senderProfile = await matrimonyProfileModel.findOne({ userId: fromUserId });


    // Save shared biodata
    const shared = await sharedBiodataModel.create({
        fromUser: fromUserId,
        toUser: toUserId,
        profileShared: senderProfile?._id,
    });

    // Fetch receiver info
    const receiver = await UserModel.findById(toUserId);

    if (!senderProfile) {
        throw new ApiError(404, 'Sender profile not found');
    }


    //@ts-ignore
    if (receiver?.fcmTokens?.length > 0) {
        await notificationService.send({
            tokens: receiver?.fcmTokens,
            title: '📩 New Biodata Received!',
            body: `You have received a profile from ${senderProfile.personalDetails?.fullName || 'someone'}.`,
            url: `/matrimony/view-profile/${profileId}`,
            click_action: `/matrimony/view-profile/${profileId}`,
            imageUrl: senderProfile.profilePhotos?.[0],
        });
    }

    res.status(201).json(new ApiResponse(201, shared, 'Biodata shared successfully'));
});
// GET: Get sent/received biodatas
export const getSharedBiodatas = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { type } = req.query as { userId: string; type: 'sent' | 'received' };
    const userId = req.loginUser._id;

    if (!userId || !['sent', 'received'].includes(type)) {
        throw new ApiError(400, 'Invalid query parameters');
    }

    const filter = type === 'sent' ? { fromUser: userId } : { toUser: userId };

    const sharedBiodatas = await sharedBiodataModel.find(filter)
        .populate('fromUser', 'mobile')
        .populate('toUser', 'mobile')
        .populate('profileShared');

    res.status(200).json(new ApiResponse(200, sharedBiodatas, 'Shared biodatas fetched'));
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
