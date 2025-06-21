import axios from "axios";
import { ApiError } from "../middleware/ApiError.js";
import { ApiResponse } from "../middleware/ApiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { matrimonyProfileModel } from "../models/matrimony.model.js";
import UserModel from "../models/user.model.js";
import { CustomRequest } from "../types/express/index.js";

export const shareLocation = asyncHandler(async (req: CustomRequest, res) => {
    const fromUserId = req.loginUser?._id;
    const { lat, lon } = req.query;
    console.log(lat, lon);

    if (!fromUserId) {
        throw new ApiError(400, "User not found in request");
    }

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
            await UserModel.updateOne(
                { _id: fromUserId },
                { $set: { coordinates: { latitude: lat, longitude: lon }, location: locationData?.display_name }, address: locationData?.address }
            );

            await matrimonyProfileModel.updateOne(
                { userId: fromUserId },
                { $set: { lat: lat, lon: lon, address: locationData?.address } }
            );
        } catch (error) {
            //@ts-ignore
            console.error("Reverse geocoding failed:", error?.message);
        }
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { locationData }, "Location shared successfully"));
});
