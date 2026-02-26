import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IUser extends Document {
  // Auth
  email: string
  password: string
  isVerified: boolean
  isActive: boolean

  // Dating profile
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  bio?: string
  avatar?: string

  // Dating logic
  likes: mongoose.Types.ObjectId[]
  likedBy: mongoose.Types.ObjectId[]
  matches: mongoose.Types.ObjectId[]
  seenPosts: mongoose.Types.ObjectId[] // ✅ Lưu các bài đã lướt qua để loại khỏi feed

  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema<IUser> = new Schema(
  {
    // Auth
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Dating profile
    name: { type: String, required: true },
    age: { type: Number, required: true, min: 18 },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true
    },
    bio: { type: String, default: '' },
    avatar: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/default-avatar.png'
    },

    // Dating logic
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    matches: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    seenPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }] // ✅ Chứa ID của Post
  },
  { timestamps: true }
)

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema)
export default User
