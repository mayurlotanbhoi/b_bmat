import { Document, Types } from 'mongoose';

const GENDER = ['Male', 'Female', 'Other'] as const;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const MARITAL_STATUSES = ['Unmarried', 'Married', 'Divorced', 'Widowed', 'Separated'] as const;
const BOOLEAN_TEXT = ['Yes', 'No'] as const;
const MANGALIK_STATUS = ['Manglik', 'Non-Manglik', 'Don’t Know'] as const;
const JOB_TYPES = ['Private', 'Government', 'Business', 'Self-employed', 'Other'] as const;

type EnumArray<T extends readonly string[]> = T[number];

export interface IProfile extends Document {
    profileCompletion: Number,
    personalDetails: {
        fullName: string;
        gender: EnumArray<typeof GENDER>;
        dateOfBirth: Date;
        height: string;
        weight: string;
        bloodGroup: EnumArray<typeof BLOOD_GROUPS>;
        complexion: string;
        disability?: string;
        maritalStatus: EnumArray<typeof MARITAL_STATUSES>;
        children: {
            hasChildren: boolean;
            count?: number;
            livingWith?: 'Self' | 'Partner' | 'Other';
        };
    };

    religiousDetails: {
        religion: string;
        caste: string;
        subCaste?: string;
        gotra?: string;
        manglik: EnumArray<typeof MANGALIK_STATUS>;
        nakshatra?: string;
        rashi?: string;
    };

    contactDetails: {
        mobileNo: string;
        whatsappNo?: string;
        email?: string;
        presentAddress: Address;
        permanentAddress: Address;
    };

    familyDetails: {
        fatherName?: string;
        fatherOccupation?: string;
        motherName?: string;
        motherOccupation?: string;
        siblings?: {
            brothers?: Sibling[];
            sisters?: Sibling[];
        };
    };

    educationDetails: {
        highestQualification: string;
        specialization?: string;
    };

    professionalDetails: {
        occupation: string;
        companyName?: string;
        income?: string;
        workingCity?: string;
        jobType?: EnumArray<typeof JOB_TYPES>;
        workFromHome?: boolean;
    };

    lifestyleDetails: {
        smoking: 'Yes' | 'No' | 'Occasionally';
        drinking: 'Yes' | 'No' | 'Occasionally';
        eatingHabits: 'Vegetarian' | 'Non-Vegetarian' | 'Eggetarian' | 'Vegan';
    };

    expectation?: {
        ageRange?: string;
        heightRange?: string;
        religion?: string;
        caste?: string;
        subCaste?: string;
        education?: string;
        occupation?: string;
        locationPreference?: string;
    };

    documents?: {
        govermentId?: string;
    };

    isVerified: boolean;
    profilePicture: string[];
    profileStatus: 'Active' | 'Inactive' | 'Suspended';
    organization: string;
    organizationId: Types.ObjectId;
    userId: Types.ObjectId;
    profileCreatedBy: 'Self' | 'Parent' | 'Sibling' | 'Relative' | 'Other';
    matId: string;

    profileMetadata: {
        createdBy: string;
        matId: string;
        createdAt: Date;
        lastUpdated: Date;
    };
}

export type Address = {
    addressLine: string;
    area?: string;
    city: string;
    state: string;
    country: string;
    pinCode: string;
};

export type Sibling = {
    name: string;
    married: boolean;
    occupation?: string;
};