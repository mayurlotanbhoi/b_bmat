import { ApiError } from "../../middleware/ApiError.js";
import { ApiResponse } from "../../middleware/ApiResponse.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { matrimonyProfileModel } from "../../models/matrimony.model.js";
import { Request, Response } from 'express';

export const getMatrimonyProfiles = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 10, searchInput = '' } = req.query;

    const currentPage = Number(page);
    const perPage = Number(pageSize);
    const skip = (currentPage - 1) * perPage;

    const searchRegex = new RegExp(searchInput.toString(), 'i'); // case-insensitive

    const filter = {
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
    };

    const [profiles, total] = await Promise.all([
        matrimonyProfileModel
            .find(searchInput ? filter : {})
            .populate('userId')
            .skip(skip)
            .limit(perPage)
            .sort({ createdAt: -1 }),

        matrimonyProfileModel.countDocuments(searchInput ? filter : {})
    ]);

    if (!profiles.length) {
        throw new ApiError(404, 'No profiles found');
    }


    return res.status(200).json(
        new ApiResponse(200, {
            data: profiles,
            pagination: {
                total,
                currentPage,
                pageSize: perPage,
                totalPages: Math.ceil(total / perPage),
            },
        }, 'Profiles fetched successfully')
    );
});

