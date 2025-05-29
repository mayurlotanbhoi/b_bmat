import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the IUser interface, which represents the document schema
interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  uid: string;
  comparePassword(password: string): Promise<boolean>;
}

// Define the IUserModel interface which includes the static methods
interface IUserModel extends Model<IUser> {
  findUserByEmail(email: string): Promise<IUser | null>;
  createUser(email: string, password: string): Promise<IUser>;
  validatePassword(storedPassword: string, inputPassword: string): Promise<boolean>;
}

// Define the schema for the user
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  uid: {
    type: String,
    unique: true,
    required: true,
  },
});

// Hash the password before saving to the database
userSchema.pre<IUser>('save', async function (next) {
  if (this.isModified('password')) {
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
  }
  next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Static method for finding a user by email
userSchema.statics.findUserByEmail = async function (email: string) {
  return await this.findOne({ email });
};

// Static method for creating a new user
userSchema.statics.createUser = async function (email: string, password: string){
  const user = new this({
    email,
    password,
    uid: new mongoose.Types.ObjectId().toString(),
  });
  await user.save();
  return user;
};

// Static method for validating a user's password
userSchema.statics.validatePassword = async function (storedPassword: string, inputPassword: string) {
  return bcrypt.compare(inputPassword, storedPassword);
};

// Create the model
const UserModel = mongoose.model<IUser, IUserModel>('User', userSchema);

export { UserModel };
export type { IUser };