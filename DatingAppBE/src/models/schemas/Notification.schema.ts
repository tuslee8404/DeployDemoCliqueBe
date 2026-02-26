import mongoose, { Document, Schema, Model } from 'mongoose'

export interface INotification extends Document {
  sender: mongoose.Types.ObjectId
  receiver: mongoose.Types.ObjectId
  type: 'like' | 'match'
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'match'], required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
)

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', NotificationSchema)
export default Notification
