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
        throw new ApiError(400, 'Missing recipient user ID or profile ID');
    }
    // Get profile being shared
    const profileToShare = await matrimonyProfileModel.findById(profileId);
    if (!profileToShare) throw new ApiError(404, 'Profile to share not found');

    // Get sender profile
    const senderProfile = await matrimonyProfileModel.findOne({ userId: fromUserId });
    if (!senderProfile) throw new ApiError(404, 'Sender profile not found');

    // Save shared record
    const shared = await sharedBiodataModel.create({
        fromUser: fromUserId,
        toUser: toUserId,
        profileShared: profileToShare._id,
    });

    // Send notification if receiver has FCM tokens
    const receiver = await UserModel.findById(toUserId);
    //  @ts-ignore
    if (receiver?.fcmTokens?.length > 0) {
        await notificationService.send({
            //  @ts-ignore
            tokens: receiver.fcmTokens,
            title: '📩 New Biodata Received!',
            body: `You received a profile from ${senderProfile.personalDetails?.fullName || 'a user'}.`,
            url: `/scan-qr-view-profile/${profileToShare._id}`,
            click_action: `/scan-qr-view-profile/${profileToShare._id}`,
            imageUrl: senderProfile.profilePhotos?.[0] || '',
        });

        // https://bmat.onrender.com/scan-qr-view-profile
    }
    res.status(201).json(new ApiResponse(201, shared, 'Biodata shared successfully'));
});


// GET: Get sent/received biodatas
export const getSharedBiodatas = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.loginUser?._id;
    if (!userId) throw new ApiError(400, 'User not authenticated');

    const [sent, received] = await Promise.all([
        sharedBiodataModel.find({ fromUser: userId })
            .populate('fromUser', 'mobile')
            .populate('toUser', 'mobile')
            .populate('profileShared')
            .sort({ updatedAt: -1 }),

        sharedBiodataModel.find({ toUser: userId })
            .populate('fromUser', 'mobile')
            .populate('toUser', 'mobile')
            .populate('profileShared')
            .sort({ updatedAt: -1 }),
    ]);

    res.status(200).json(new ApiResponse(200, { sent, received }, 'Shared biodatas fetched'));
});


export const markBiodataViewed = asyncHandler(async (req: CustomRequest, res: Response) => {
    const viewerUserId = req.loginUser._id;
    const { id: profileOwnerUserId } = req.params;

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
            title: '👀 Someone viewed your biodata!',
            body: `Your profile was viewed by ${viewerProfile.personalDetails?.fullName || 'a user'}.`,
            url: `/scan-qr-view-profile/${viewerProfile._id}`,
            click_action: `/scan-qr-view-profilee/${viewerProfile._id}`,
            imageUrl: viewerProfile.profilePhotos?.[0] || '',
        });
    }

    // Update shared record
    const updated = await sharedBiodataModel.findOneAndUpdate(
        { fromUser: viewerProfile._id, toUser: ownerProfile._id },
        { isViewed: true, viewedAt: new Date() },
        { new: true }
    );

    if (!updated) {
        throw new ApiError(404, 'No shared record found between viewer and profile owner');
    }

    res.status(200).json(new ApiResponse(200, updated, 'Viewed status updated and notification sent'));
});



export const getBioData = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(id);
    const biodata = await matrimonyProfileModel.findById(id);
    if (!biodata) {
        throw new ApiError(404, 'Shared biodata not found');
    }
    res.status(200).json(new ApiResponse(200, biodata, 'Biodata fetched successfully'));
})
