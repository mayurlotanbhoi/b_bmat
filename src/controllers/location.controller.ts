import axios from "axios";
import { ApiError } from "../middleware/ApiError.js";
import { ApiResponse } from "../middleware/ApiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { matrimonyProfileModel } from "../models/matrimony.model.js";
import UserModel from "../models/user.model.js";
import { CustomRequest } from "../types/express/index.js";

export const getLocation = asyncHandler(async (req: CustomRequest, res) => {
    const fromUserId = req.loginUser?._id;
    const { lat, lon } = req.query;
    // console.log(lat, lon);

    // if (!fromUserId) {
    //     throw new ApiError(400, "User not found in request");
    // }

    let locationData = null;

    if (lat && lon) {
        try {
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
                {
                    headers: {
                        "User-Agent": "VaishyaMatrimony/1.0 (support@vaishyaparinay.com)",
                        Accept: "application/json",
                    },
                }
            );
            console.log("response", response)

            locationData = response?.data;

            // Optional: Set location data in user model if needed
            // await UserModel.updateOne(
            //     { _id: fromUserId },
            //     { $set: { coordinates: { latitude: lat, longitude: lon }, location: locationData?.display_name }, address: locationData?.address }
            // );
            // await matrimonyProfileModel.updateOne(
            //     { userId: fromUserId },
            //     { $set: { lat: lat, lon: lon, address: locationData?.address } }
            // );

        } catch (error) {
            //@ts-ignore
            console.error("Reverse geocoding failed:", error?.message);
        }
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { locationData }, "Location shared successfully"));
});


export const updateInitialdetails = asyncHandler(async (req: CustomRequest, res) => {
    const fromUserId = req.loginUser?._id;
    const { relation, language, location, locationObject } = req.body;

    // If no user ID, silently return
    if (!fromUserId) {
        return res.status(200).json(new ApiResponse(200, {}, "No user ID, skipping update"));
    }

    const lat = parseFloat(locationObject?.lat || '0');
    const lon = parseFloat(locationObject?.lon || '0');
    const address = locationObject?.address || {};
    const displayName = locationObject?.display_name || location || '';

    // Update UserModel (skip if nothing to update)
    await UserModel.updateOne(
        { _id: fromUserId },
        {
            $set: {
                ...(lat && lon && { coordinates: { latitude: lat, longitude: lon } }),
                ...(language && { language }),
                ...(displayName && { location: displayName }),
                ...(address && { address }),
            },
        }
    );

    // Update MatrimonyProfileModel
    await matrimonyProfileModel.updateOne(
        { userId: fromUserId },
        {
            $set: {
                ...(lat && { lat }),
                ...(lon && { lon }),
                ...(address && { address }),
                ...(relation && { profileCreatedBy: relation }),
            },
        }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, { locationObject }, "Initial details updated successfully"));
});
