// models/sharedBiodata.model.js
import mongoose from 'mongoose';

const sharedBiodataSchema = new mongoose.Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        profileShared: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Profile', // the profile being shared
            required: true,
        },
        message: {
            type: String,
            default: '',
        },
        isViewed: {
            type: Boolean,
            default: false,
        },
        viewedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

export default mongoose.model('SharedBiodata', sharedBiodataSchema);
