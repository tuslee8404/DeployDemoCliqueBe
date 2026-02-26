import mongoose, { Document, Schema, Model } from 'mongoose'

// Interface cho document RefreshToken
export interface IRefreshToken extends Document {
  refreshtoken: string
  created_at: Date
  user_id: mongoose.Types.ObjectId
}

// Schema
const RefreshTokenSchema: Schema<IRefreshToken> = new Schema(
  {
    refreshtoken: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true } // Tạo createdAt, updatedAt tự động
)

// Model
const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)

export default RefreshToken
