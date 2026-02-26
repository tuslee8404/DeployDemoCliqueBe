import mongoose, { Document, Schema } from 'mongoose'

export interface IDateAppointment extends Document {
  user1: mongoose.Types.ObjectId // Một trong 2 người
  user2: mongoose.Types.ObjectId // Người còn lại
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  status: 'scheduled' | 'canceled'
  createdAt: Date
  updatedAt: Date
}

const DateAppointmentSchema: Schema = new Schema(
  {
    user1: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user2: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'canceled'], default: 'scheduled' }
  },
  {
    timestamps: true
  }
)

// Index để load danh sách lịch hẹn của 1 User nhanh
DateAppointmentSchema.index({ user1: 1 })
DateAppointmentSchema.index({ user2: 1 })
DateAppointmentSchema.index({ date: 1 })

const DateAppointment = mongoose.model<IDateAppointment>('DateAppointment', DateAppointmentSchema)
export default DateAppointment
