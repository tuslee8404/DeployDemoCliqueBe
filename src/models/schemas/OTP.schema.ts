import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IOTP extends Document {
  email: string
  otp: string
  purpose: 'register' | 'reset_password'
  isUsed: boolean
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface IOTPModel extends Model<IOTP> {
  generateOTP(): string
  createOTP(email: string, purpose: 'register' | 'reset_password'): Promise<string>
  verifyOTP(email: string, otp: string, purpose: 'register' | 'reset_password'): Promise<boolean>
}

const otpSchema = new Schema<IOTP, IOTPModel>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    otp: {
      type: String,
      required: true,
      length: 6
    },
    purpose: {
      type: String,
      enum: ['register', 'reset_password'],
      required: true
    },
    isUsed: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }
  },
  {
    timestamps: true,
    collection: 'otps'
  }
)

// Index để tự động xóa OTP hết hạn
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Index để tìm kiếm nhanh
otpSchema.index({ email: 1, purpose: 1 })
otpSchema.index({ email: 1, otp: 1, purpose: 1 })

// Static method để tạo OTP
otpSchema.statics.generateOTP = function (): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Static method để tạo và lưu OTP
otpSchema.statics.createOTP = async function (email: string, purpose: 'register' | 'reset_password'): Promise<string> {
  // Xóa các OTP cũ chưa sử dụng của email này với purpose này
  await this.deleteMany({
    email,
    purpose,
    isUsed: false
  })

  const otp = this.generateOTP()

  await this.create({
    email,
    otp,
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  })

  return otp
}

// Static method để verify OTP
otpSchema.statics.verifyOTP = async function (
  email: string,
  otp: string,
  purpose: 'register' | 'reset_password'
): Promise<boolean> {
  const otpDoc = await this.findOne({
    email,
    otp,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  })

  if (!otpDoc) {
    return false
  }

  // Đánh dấu OTP đã được sử dụng
  await this.updateOne({ _id: otpDoc._id }, { isUsed: true })

  return true
}

export const OTP = mongoose.model<IOTP, IOTPModel>('OTP', otpSchema)
export default OTP
