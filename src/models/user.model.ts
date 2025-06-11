import mongoose, { Document, Schema, Model, Types, ObjectId } from 'mongoose';
import bcrypt from 'bcryptjs';

// =======================
// Interface: IUser
// =======================
export interface IUser extends Document {
  _id: Types.ObjectId;
  uid: string;

  name: string;
  location?: string | null;
  language?: string;

  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;

  profilePicture?: string | null;
  email: string;
  password: string;
  mobile: string | null;

  loginMethodHistory?: {
    method: 'google' | 'phone' | 'password';
    timestamp: Date;
  }[];

  isActive: 'active' | 'inactive' | 'banned';
  bannedReason?: string | null;

  paymentHistory?: Types.ObjectId[];

  refreshToken?: string | null;
  accessToken?: string | null;
  fcmTokens?: string[];

  userRole: 'admin' | 'user';

  organizationId?: Types.ObjectId | null;
  referredBy?: Types.ObjectId | null;
  matrimonyId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;

  comparePassword(password: string): Promise<boolean>;
}

// =======================
// Interface: IUserModel (Static Methods)
// =======================
interface IUserModel extends Model<IUser> {
  findUserByEmail(email: string): Promise<IUser | null>;
  createUserWithPhone(phone: string, password: string,): Promise<IUser>;
  createUserWithGoogle(email: string, name: string, profilePicture?: string): Promise<IUser>;
  validatePassword(storedPassword: string, inputPassword: string): Promise<boolean>;
  updateRefreshAndAccessToken(userId: any, refreshToken: string, accessToken: string): Promise<IUser>;
  updateFcmTokens(userId: any, fcmTokens: string): Promise<IUser>;
}

// =======================
// Schema: userSchema
// =======================
const userSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    location: { type: String, default: null, trim: true },
    language: { type: String, default: 'en' },

    coordinates: {
      type: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
      default: null,
    },


    profilePicture: { type: String, default: null, trim: true },

    email: { type: String, default: null, lowercase: true, trim: true },
    password: { type: String, },
    mobile: { type: String, default: null },

    loginMethodHistory: [
      {
        method: { type: String, enum: ['google', 'phone',], default: 'google' },
        timestamp: Date,
      },
    ],

    isActive: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
    },
    bannedReason: { type: String, default: null },
    paymentHistory: [{ type: Schema.Types.ObjectId, ref: 'Payment' }],
    refreshToken: { type: String, default: null },
    accessToken: { type: String, default: null },
    fcmTokens: { type: [String], default: [] },
    userRole: { type: String, enum: ['admin', 'user'], default: 'user' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    matrimonyId: { type: Schema.Types.ObjectId, ref: 'Matrimony', default: null },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// =======================
// Middleware: Password Hash
// =======================
userSchema.pre<IUser>('save', async function (next) {
  if (this.isModified('password')) {
    const hashed = await bcrypt.hash(this.password, 10);
    this.password = hashed;
  }
  next();
});

// =======================
// Instance Method
// =======================
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

userSchema.statics.updateFcmTokens = async function (userId: any, fcmTokens: string) {
  return await this.findByIdAndUpdate(
    userId,
    { fcmTokens },
    { new: true }
  );
};

userSchema.statics.updateRefreshAndAccessToken = async function (
  userId: string,
  refreshToken: string,
  accessToken: string
) {
  return await this.findByIdAndUpdate(
    userId,
    { $set: { refreshToken, accessToken } }, // avoids duplicates
    { new: true }
  ).select('name userRole mobile email profilePicture language');
};

// =======================
// Static Methods
// =======================
userSchema.statics.findUserByEmail = async function (email: string) {
  return this.findOne({ email });
};

userSchema.statics.getAllfcmTokens = async function () {
  return this.findOne().select('fcmTokens');
}



// userSchema.statics.createUser = async function (phone: string, password: string, profilePicture?: string) {
//   const user = new this({
//     phone,
//     password,
//     profilePicture
//   });
//   await user.save();
//   return user;
// };

userSchema.statics.createUserWithPhone = async function (
  mobile: string,
  password: string,
) {
  const user = new this({ mobile, password, loginMethodHistory: [{ method: 'phone', timestamp: new Date() }], });
  await user.save();
  return user;
};

userSchema.statics.createUserWithGoogle = async function (
  email: string,
  name: string,
  profilePicture?: string
) {
  const user = new this({ email, name, profilePicture, loginMethodHistory: [{ method: 'google', timestamp: new Date() }], });
  await user.save();
  return user;
};

userSchema.statics.validatePassword = async function (storedPassword: string, inputPassword: string) {
  return bcrypt.compare(inputPassword, storedPassword);
};

// =======================
// Model Export
// =======================
const UserModel = mongoose.model<IUser, IUserModel>('User', userSchema);

export { UserModel };
// export type { IUser };
export default UserModel;