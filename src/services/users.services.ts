import { signToken } from '~/utils/jwt'
import { TokenType } from '~/constants/enum'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import OTP from '~/models/schemas/OTP.schema'
import { RegisterReqBody, UpdateProfileReqBody } from '~/models/requests/User.requests'
import User from '~/models/schemas/User.schema'
import { hashPassword } from '~/utils/crypto'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { sendOTPEmail } from '~/services/email.services'
import HTTP_STATUS from '~/constants/httpStatus'

class UsersService {
  private signAccessToken({ user_id }: { user_id: string }) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ? parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN, 10) : undefined
      }
    })
  }

  private signRefreshToken({ user_id }: { user_id: string }) {
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ? parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN, 10) : undefined
      }
    })
  }

  private signAccessAndRefreshToken({ user_id }: { user_id: string }) {
    return Promise.all([this.signAccessToken({ user_id }), this.signRefreshToken({ user_id })])
  }

  // ─── AUTH ──────────────────────────────────────────────────

  async checkEmailExist(email: string) {
    const user = await User.findOne({ email })
    return !!user
  }

  async sendOTP(email: string, purpose: 'register' | 'reset_password') {
    if (purpose === 'register') {
      const exists = await this.checkEmailExist(email)
      if (exists) return { status: HTTP_STATUS.BAD_REQUEST, message: 'Email đã được sử dụng' }
      // Cho phép skip gửi email OTP đăng ký
      return { message: 'OTP bypass: Bạn có thể đăng ký trực tiếp', skipOTP: true }
    } else {
      const exists = await this.checkEmailExist(email)
      if (!exists) return { status: HTTP_STATUS.BAD_REQUEST, message: 'Email chưa được đăng ký' }
    }

    const otp = await OTP.createOTP(email, purpose)
    await sendOTPEmail(email, otp, purpose)

    return { message: 'OTP đã được gửi đến email của bạn', expiresIn: 300 }
  }

  async verifyRegisterOTP(payload: RegisterReqBody) {
    if (payload.password !== payload.confirm_password) {
      return { status: HTTP_STATUS.BAD_REQUEST, message: 'Mật khẩu xác nhận không khớp' }
    }

    // Bỏ qua bước kiểm tra OTP cho đăng ký theo yêu cầu
    // const valid = await OTP.verifyOTP(payload.email, payload.otp, 'register')
    // if (!valid) return { status: HTTP_STATUS.BAD_REQUEST, message: 'OTP không hợp lệ hoặc đã hết hạn' }

    const newUser = await User.create({
      email: payload.email,
      password: hashPassword(payload.password),
      name: payload.name,
      age: payload.age,
      gender: payload.gender,
      bio: payload.bio || '',
      isVerified: true
    })

    return { status: HTTP_STATUS.CREATED, message: 'Đăng ký thành công', userId: newUser._id }
  }

  async verifyResetPasswordOTP({ email, otp }: { email: string; otp: string }) {
    const valid = await OTP.verifyOTP(email, otp, 'reset_password')
    if (!valid) return { status: HTTP_STATUS.BAD_REQUEST, message: 'OTP không hợp lệ hoặc đã hết hạn' }
    return { status: HTTP_STATUS.OK, message: 'OTP hợp lệ' }
  }

  async resetPassword(email: string, new_password: string, confirm_password: string) {
    if (new_password !== confirm_password) {
      return { status: HTTP_STATUS.BAD_REQUEST, message: 'Mật khẩu xác nhận không khớp' }
    }

    const result = await User.findOneAndUpdate(
      { email },
      { $set: { password: hashPassword(new_password) } },
      { new: true }
    )

    if (!result) return { status: HTTP_STATUS.NOT_FOUND, message: 'Người dùng không tồn tại' }
    return { status: HTTP_STATUS.OK, message: 'Đặt lại mật khẩu thành công' }
  }

  async login({ user_id }: { user_id: string }) {
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken({ user_id })

    await RefreshToken.findOneAndUpdate(
      { user_id: new mongoose.Types.ObjectId(user_id) },
      { refreshtoken: refresh_token },
      { upsert: true, new: true }
    )

    return { access_token, refresh_token }
  }

  async refreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    const [new_access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken({ user_id }),
      this.signRefreshToken({ user_id }),
      RefreshToken.deleteOne({ refreshtoken: refresh_token })
    ])

    await RefreshToken.create({
      user_id: new mongoose.Types.ObjectId(user_id),
      refreshtoken: new_refresh_token
    })

    return { access_token: new_access_token, refresh_token: new_refresh_token }
  }

  async logout(user_id: string) {
    return RefreshToken.deleteMany({ user_id: new mongoose.Types.ObjectId(user_id) })
  }

  // ─── PROFILE ───────────────────────────────────────────────

  async getMe(user_id: string) {
    const user = await User.findById(user_id, '-password')
    if (!user) throw new Error('User not found')
    return user
  }

  async updateProfile(user_id: string, payload: UpdateProfileReqBody) {
    const updateData: Partial<UpdateProfileReqBody> = {}

    if (payload.name !== undefined) updateData.name = payload.name
    if (payload.age !== undefined) updateData.age = payload.age
    if (payload.gender !== undefined) updateData.gender = payload.gender
    if (payload.bio !== undefined) updateData.bio = payload.bio
    if (payload.avatar !== undefined) updateData.avatar = payload.avatar

    const updated = await User.findByIdAndUpdate(user_id, { $set: updateData }, { new: true, select: '-password' })

    if (!updated) throw new Error('User not found')
    return updated
  }

  async generateUploadSignature() {
    const cloudname = process.env.CLOUDINARY_CLOUD_NAME
    const apikey = process.env.CLOUDINARY_API_KEY
    const apisecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudname || !apikey || !apisecret) throw new Error('Cloudinary configuration is missing')

    const timestamp = Math.round(Date.now() / 1000)
    const signature = crypto
      .createHash('sha1')
      .update(`timestamp=${timestamp}` + apisecret)
      .digest('hex')

    return { signature, timestamp, cloudname, apikey }
  }
}

const usersService = new UsersService()
export default usersService
