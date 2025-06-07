import yup, { AnySchema } from "yup"
import {
    mobileRegex,
    pinCodeRegex,
    nameRegex,
    emailRegex,
} from "../constants/regexPatterns.js";
import { ValidationError } from "yup";
import { ApiError } from "../middleware/ApiError.js";

const addressSchema = yup.object({
    // addressLine: yup.string().required("Address Line is required"),
    area: yup.string().required("Area is required"),
    city: yup.string().required("City is required"),
    state: yup.string().required("State is required"),
    country: yup.string().nullable(),
    pinCode: yup
        .string()
        .required("Pin Code is required")
        .matches(pinCodeRegex, "Invalid Pin Code format"),
});

const profileValidationSchema = yup.object({
    personalDetails: yup.object({
        fullName: yup
            .string()
            .required("Full name is required")
            .matches(nameRegex, "Only letters and spaces allowed"),
        gender: yup
            .string()
            .oneOf(["Male", "Female", "Other"], "Invalid gender")
            .required("Gender is required"),
        dateOfBirth: yup.date().required("Date of birth is required"),
        height: yup.string().nullable(),
        weight: yup.string().nullable(),
        bloodGroup: yup.string().nullable(),
        complexion: yup.string().nullable(),
        disability: yup.string().nullable(),
        maritalStatus: yup
            .string()
            .oneOf(["Unmarried", "Married", "Divorced", "Widowed"], "Invalid marital status")
            .required("Marital status is required"),
        children: yup.string().nullable(),
    }),

    religiousDetails: yup.object({
        religion: yup.string().nullable(),
        caste: yup.string().required("Caste is required"),
        subCaste: yup.string().nullable(),
        gotra: yup.string().nullable(),
        manglik: yup.string().nullable(),
        nakshatra: yup.string().nullable(),
        rashi: yup.string().nullable(),
    }),

    contactDetails: yup.object({
        mobileNo: yup
            .string()
            .required("Mobile number is required")
            .matches(mobileRegex, "Invalid mobile number"),
        whatsappNo: yup.string().matches(mobileRegex, "Invalid WhatsApp number").nullable(),
        email: yup
            .string()
            .email("Invalid email address")
            .matches(emailRegex, "Invalid email address")
            .required("Email is required"),
        presentAddress: addressSchema.required("Present address is required"),
        permanentAddress: addressSchema.required("Permanent address is required"),
    }),

    familyDetails: yup.object({
        fatherName: yup
            .string()
            .required("Father's name is required")
            .matches(nameRegex, "Only letters and spaces allowed"),
        fatherOccupation: yup.string().nullable(),
        motherName: yup
            .string()
            .required("Mother's name is required")
            .matches(nameRegex, "Only letters and spaces allowed"),
        motherOccupation: yup.string().nullable(),
        sister: yup.string().nullable(),
        brother: yup.string().nullable(),
        marriedBrother: yup.string().nullable(),
        marriedSister: yup.string().nullable(),
    }),

    educationDetails: yup.object({
        highestQualification: yup.string().required("Qualification is required"),
        specialization: yup.string().nullable(),
    }),

    professionalDetails: yup.object({
        occupation: yup.string().required("Occupation is required"),
        companyName: yup.string().nullable(),
        income: yup.string().nullable(),
        workingCity: yup.string().nullable(),
        jobType: yup.string().nullable(),
        workFromHome: yup.string().nullable().default('No'),
    }),

    lifestyleDetails: yup.object({
        smoking: yup.string().nullable(),
        drinking: yup.string().nullable(),
        eatingHabits: yup.string().nullable(),
    }),

    expectation: yup.object({
        ageRange: yup.string().nullable(),
        heightRange: yup.string().nullable(),
        income: yup.string().nullable(),
        religion: yup.string().nullable(),
        caste: yup.string().nullable(),
        subCaste: yup.string().nullable(),
        education: yup.array().nullable(),
        occupation: yup.array().nullable(),
        locationPreference: yup.string().nullable(),
    }),

    isVerified: yup.boolean().default(false),
    verificationImage: yup
        .string()
        .nullable()
        .test("is-valid-url", "Government ID must be a valid URL", (value) => {
            if (!value) return true; // allow null
            try {
                const url = new URL(value);
                return true;
            } catch {
                return false;
            }
        }),

    profilePhotos: yup
        .array()
        .of(
            yup
                .string()
                .test("is-valid-url", "Profile picture must be a valid URL", (value) => {
                    if (!value) return false;
                    try {
                        new URL(value);
                        return true;
                    } catch {
                        return false;
                    }
                })
        )
        .test(
            "at-least-one",
            "At least one profile picture is required",
            (value) => {
                if (value === null) return false;
                return Array.isArray(value) && typeof value[0] === "string" && value[0].trim() !== "";
            }
        )
        .required("Profile picture is required"),


    profileStatus: yup
        .string()
        .oneOf(['Active', 'Inactive', 'Suspended', 'Pending'], "Invalid status")
        .default("Pending"),

    organization: yup.string().nullable(),
    organizationId: yup.string().nullable(),
    userId: yup.string().nullable(),
    profileCreatedBy: yup.string().oneOf(['Self', 'Parent', 'Sibling', 'Relative', 'Other']).nullable().default('Self'),

    profileMetadata: yup.object({
        createdBy: yup.string().nullable(),
        matId: yup.string().nullable(),
        createdAt: yup.date().nullable(),
        lastUpdated: yup.date().nullable(),
    }),
});



interface ValidationFieldError {
    field: string;
    message: string;
}

/**
 * Validates only the fields present in the payload using the full Yup schema.
 * Throws ApiError if any validation fails.
 */
export const validatePartialProfile = async (
    partialData: Record<string, any>
): Promise<boolean> => {
    const errors: ValidationFieldError[] = [];

    const validateField = async (path: string, value: any) => {
        try {
            const fieldSchema = yup.reach(profileValidationSchema, path);
            if (typeof (fieldSchema as AnySchema).validate === "function") {
                await (fieldSchema as AnySchema).validate(value);
            }
        } catch (err) {
            if (err instanceof ValidationError) {
                errors.push({
                    field: path,
                    message: err.message,
                });
            }
        }
    };

    const traverse = async (data: any, prefix = ""): Promise<void> => {
        for (const key of Object.keys(data)) {
            const value = data[key];
            const currentPath = prefix ? `${prefix}.${key}` : key;

            if (
                value !== null &&
                typeof value === "object" &&
                !(value instanceof Date) &&
                !(value instanceof File)
            ) {
                await traverse(value, currentPath);
            } else {
                await validateField(currentPath, value);
            }
        }
    };

    await traverse(partialData);

    if (errors.length > 0) {
        throw new ApiError(400, "Validation failed", errors as any);
    }

    return true;
};

export { profileValidationSchema };
