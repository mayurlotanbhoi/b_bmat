import mongoose, { Model, Schema } from 'mongoose';
import AutoIncrementFactory from 'mongoose-sequence';

import { calculateProfileCompletion } from '../utils/calculateProfileCompletion.utils.js';
import { Address, IProfile, Sibling } from '../types/profile.types.js';
import { BLOOD_GROUPS, GENDER, JOB_TYPES, MANGALIK_STATUS, MARITAL_STATUSES } from '../constants/comman.js';
import { number } from 'yup';

const AutoIncrement = AutoIncrementFactory(mongoose as any);

interface IMatrimonyModel extends Model<IProfile> {
    findUserByEmail(email: string): Promise<IProfile | null>;
    createMatrimonyProfile(profile: any): IProfile;
    createUser(email: string, password: string): Promise<IProfile>;
    findUserByUserId(userId: string): Promise<IProfile | null>;
}


const addressSchema = new Schema<Address>({
    addressLine: { type: String, trim: true },
    area: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    pinCode: { type: String, required: true },
}, { _id: false });

const siblingSchema = new Schema<Sibling>({
    name: { type: String, required: true },
    married: { type: Boolean, required: true },
    occupation: { type: String }
}, { _id: false });

const profileSchema = new Schema<IProfile>({
    profileCompletion: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
    },

    personalDetails: {
        fullName: { type: String, required: true, trim: true },
        gender: { type: String, enum: GENDER, required: true },
        dateOfBirth: { type: Date, required: true },
        height: { type: String, required: true },
        weight: { type: String, required: true },
        bloodGroup: { type: String, enum: BLOOD_GROUPS, required: false },
        complexion: { type: String, default: 'NA' },
        disability: { type: String, default: 'None' },
        maritalStatus: { type: String, enum: MARITAL_STATUSES, required: true },
        children: {
            hasChildren: { type: Boolean, },
            count: { type: Number },
            livingWith: { type: String, enum: ['Self', 'Partner', 'Other'] }
        }
    },

    religiousDetails: {
        religion: { type: String, required: true, default: "Hindu" },
        caste: { type: String, required: true },
        subCaste: String,
        gotra: String,
        manglik: { type: String, enum: MANGALIK_STATUS, default: 'NA' },
        nakshatra: { type: String, default: 'NA' },
        rashi: { type: String, default: 'NA' },
    },

    contactDetails: {
        mobileNo: { type: String, required: true, match: /^[+\d]?[0-9]{10,15}$/ },
        whatsappNo: { type: String, required: true, match: /^[+\d]?[0-9]{10,15}$/ },
        email: { type: String, match: /.+\@.+\..+/ },
        presentAddress: { type: addressSchema, required: true },
        permanentAddress: { type: addressSchema, required: true },
    },

    familyDetails: {
        fatherName: { type: String, required: true },
        fatherOccupation: { type: String, default: 'NA' },
        motherName: { type: String, required: true },
        motherOccupation: { type: String, default: 'NA' },
        brothers: { type: String, default: '0' },
        sisters: { type: String, default: '0' },
        marriedBrothers: { type: String, default: '0' },
        marriedSisters: { type: String, default: '0' },

    },

    educationDetails: {
        highestQualification: { type: String, required: true },
        specialization: { type: String, default: 'NA' },
    },

    professionalDetails: {
        occupation: { type: String, required: true },
        companyName: { type: String, default: 'NA' },
        income: { type: String, required: true, default: 'NA' },
        workingCity: { type: String, default: 'NA' },
        // jobType: { type: String, enum: JOB_TYPES },
        workFromHome: { type: String, default: 'No' },
    },

    lifestyleDetails: {
        smoking: { type: String, required: true },
        drinking: { type: String, required: true },
        eatingHabits: { type: String, required: true },
    },

    expectation: {
        ageRange: { type: String, default: 'NA' },
        heightRange: { type: String, default: 'NA' },
        religion: { type: String, default: 'NA' },
        income: { type: String, default: 'NA' },
        caste: { type: String, default: 'NA' },
        subCaste: { type: String, default: 'NA' },
        education: { type: [String], default: 'NA' },
        occupation: { type: [String], default: 'NA' },
        locationPreference: { type: String, default: 'NA' }
    },

    verificationImage: {
        type: String,
        required: false
    },
    profilePhotos: {
        type: [String],
        validate: {
            validator: function (arr: string) {
                return Array.isArray(arr) && typeof arr[0] === 'string' && arr[0].trim() !== '';
            },
            message: 'At least one profile photo is required (profilePhotos[0])',
        },
    },


    isVerified: { type: Boolean, default: false },
    profileStatus: {
        type: String,
        enum: ['Active', 'Inactive', 'Pending', 'Suspended'],
        default: 'Active'
    },
    lat: { type: Number },
    lon: { type: Number },
    address: {
        city_district: String,
        city: String,
        county: String,
        state_district: String,
        state: String,
        'ISO3166-2-lvl4': String,
        postcode: String,
        country: String,
        country_code: String
    },

    organization: { type: String, required: false, default: 'NA' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    profileCreatedBy: {

        type: String,
        enum: ['Self', 'Parent', 'Sibling', 'Relative', 'Other'],
        required: true
    },

    matId: { type: Number, },

    profileMetadata: {
        createdBy: { type: String, },
        matId: { type: Number, },
        createdAt: { type: Date, default: Date.now },
        lastUpdated: { type: Date, default: Date.now }
    }
}, { timestamps: true });

profileSchema.index({
    matId: 1,
    userId: 1,
    organizationId: 1,
    'personalDetails.fullName': 1,
    'professionalDetails.income': 1,
});

profileSchema.pre("save", function (next) {
    if (!this.matId) {
        // this.matId = `MAT${String(this.matId).padStart(5, "0")}`;
    }
    this.profileCompletion = calculateProfileCompletion(this);
    next();
});

//@ts-ignore
profileSchema.plugin(AutoIncrement, {
    inc_field: "matId", // auto-incremented number
    start_seq: 1000,
});


profileSchema.statics.findUserByUserId = async function (userId: string) {
    return this.findOne({ userId });
};
profileSchema.statics.findUserByMatId = async function (matId: string) {
    return this.findOne({ matId });
};
profileSchema.statics.findUserByOrganizationId = async function (organizationId: string) {
    return this.find({ organizationId });
};


profileSchema.statics.createMatrimonyProfile = async function (matProfile) {
    const newMAt = new this(matProfile)
    await newMAt.save();
    return newMAt;
};

// const weights = {
//     personalDetails: 20,
//     religiousDetails: 10,
//     contactDetails: 15,
//     familyDetails: 10,
//     educationDetails: 10,
//     professionalDetails: 15,
//     lifestyleDetails: 5,
//     profilePicture: 10,
//     documents: 5,
// };
// const sections = [
//     'personalDetails',
//     'religiousDetails',
//     'contactDetails',
//     'familyDetails',
//     'educationDetails',
//     'professionalDetails',
//     'lifestyleDetails',
//     'profilePicture',
//     'documents'
// ];



// function calculateProfileCompletion(profile: any): number {
//     let completed = 0;

//     if (profile.personalDetails?.fullName && profile.personalDetails?.gender && profile.personalDetails?.dateOfBirth) {
//         completed += weights.personalDetails;
//     }

//     if (profile.religiousDetails?.religion && profile.religiousDetails?.caste) {
//         completed += weights.religiousDetails;
//     }

//     if (profile.contactDetails?.mobileNo && profile.contactDetails?.presentAddress?.city) {
//         completed += weights.contactDetails;
//     }

//     if (profile.familyDetails?.fatherName || profile.familyDetails?.motherName) {
//         completed += weights.familyDetails;
//     }

//     if (profile.educationDetails?.highestQualification) {
//         completed += weights.educationDetails;
//     }

//     if (profile.professionalDetails?.occupation) {
//         completed += weights.professionalDetails;
//     }

//     if (profile.lifestyleDetails?.eatingHabits && profile.lifestyleDetails?.drinking) {
//         completed += weights.lifestyleDetails;
//     }

//     if (profile.profilePicture?.length > 0) {
//         completed += weights.profilePicture;
//     }

//     if (profile.documents?.govermentId) {
//         completed += weights.documents;
//     }

//     return completed;
// }


export const matrimonyProfileModel = mongoose.model<IProfile, IMatrimonyModel>('Profile', profileSchema);
