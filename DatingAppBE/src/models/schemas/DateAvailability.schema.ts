import mongoose, { Document, Schema } from 'mongoose'

export interface ITimeSlot {
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
}

export interface IDateAvailability extends Document {
  userId: mongoose.Types.ObjectId
  targetUserId: mongoose.Types.ObjectId
  slots: ITimeSlot[]
  createdAt: Date
  updatedAt: Date
}

const DateAvailabilitySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    slots: [
      {
        date: { type: String, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true }
      }
    ]
  },
  {
    timestamps: true
  }
)

// Index để truy vấn nhanh: Khi A tìm lịch rảnh với B
DateAvailabilitySchema.index({ userId: 1, targetUserId: 1 }, { unique: true })

const DateAvailability = mongoose.model<IDateAvailability>('DateAvailability', DateAvailabilitySchema)
export default DateAvailability
