import { Request, Response } from 'express'
import { NextFunction, ParamsDictionary } from 'express-serve-static-core'
import usersService from '~/services/users.services'
import {
  LoginReqBody,
  RegisterReqBody,
  RefreshTokenReqBody,
  TokenPayload,
  UpdateProfileReqBody,
  SendOTPReqBody
} from '../models/requests/User.requests'
import mongoose from 'mongoose'
import { USERS_MESSAGES } from '../constants/messages'
import { IUser } from '../models/schemas/User.schema'
import { config } from 'dotenv'
config()

// ─── OTP ─────────────────────────────────────────────────────

export const sendOTPRegister = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body
    const result = await usersService.sendOTP(email, 'register')
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export const sendOTPResetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body
    const result = await usersService.sendOTP(email, 'reset_password')
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export const verifyRegisterOTP = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    // ✅ Đổi firstname/lastname/birthday → name/age/gender
    const { email, otp, name, age, gender, bio, password, confirm_password } = req.body

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' })
    }

    const result = await usersService.verifyRegisterOTP({
      email,
      otp,
      name,
      age,
      gender,
      bio,
      password,
      confirm_password
    })
    res.json(result)
  } catch (error) {
    console.error('Verify OTP error:', error)
    res.status(500).json({ message: 'Xác thực OTP thất bại' })
  }
}

export const verifyResetPasswordOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' })
    }

    const result = await usersService.verifyResetPasswordOTP({ email, otp })
    res.json(result)
  } catch (error) {
    console.error('Verify OTP error:', error)
    res.status(500).json({ message: 'Xác thực OTP thất bại' })
  }
}

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, new_password, confirm_password } = req.body
    const result = await usersService.resetPassword(email, new_password, confirm_password)
    res.json(result)
  } catch (error) {
    console.error('Reset Password error:', error)
    res.status(500).json({ message: 'Đặt lại mật khẩu thất bại' })
  }
}

// ─── AUTH ─────────────────────────────────────────────────────

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as IUser
    if (!user) return res.status(400).json({ message: USERS_MESSAGES.USER_NOT_FOUND })

    const user_id = (user._id as mongoose.Types.ObjectId).toString()
    const result = await usersService.login({ user_id })

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })

    // ✅ Bỏ user.profile, loại password trước khi trả về
    const { password, ...userSafe } = user.toObject()
    res.json({
      message: USERS_MESSAGES.LOGIN_SUCCESS,
      access_token: result.access_token,
      user: userSafe
    })
  } catch (error) {
    next(error)
  }
}

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const user = await usersService.getMe(user_id)
    res.json({ message: USERS_MESSAGES.GET_ME_SUCCESS, result: user })
  } catch (error) {
    next(error)
  }
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const refresh_token = req.cookies.refreshToken || req.body.refresh_token
    const { user_id } = req.decoded_refresh_token as TokenPayload

    const result = await usersService.refreshToken({ user_id, refresh_token })

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })

    res.json({
      message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
      access_token: result.access_token,
      refresh_token: result.refresh_token
    })
  } catch (error) {
    next(error)
  }
}

// ─── PROFILE ──────────────────────────────────────────────────

export const getUploadSignatureController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signatureData = await usersService.generateUploadSignature()
    res.json({
      message: 'Get upload signature success',
      ...signatureData
    })
  } catch (error) {
    next(error)
  }
}

export const updateProfileController = async (
  req: Request<ParamsDictionary, any, UpdateProfileReqBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const updatedUser = await usersService.updateProfile(user_id, req.body)
    res.json({ message: USERS_MESSAGES.UPDATE_ME_SUCCESS, user: updatedUser })
  } catch (error) {
    next(error)
  }
}

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    await usersService.logout(user_id)
    res.clearCookie('refreshToken')
    res.json({ message: USERS_MESSAGES.LOGOUT_SUCCESS })
  } catch (error) {
    next(error)
  }
}
