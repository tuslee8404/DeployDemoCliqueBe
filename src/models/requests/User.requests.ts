import { Jwt, JwtPayload } from 'jsonwebtoken'
import { TokenType, UserVerifyStatus } from '~/constants/enum'
import { ParamsDictionary } from 'express-serve-static-core'

export interface RegisterReqBody {
  email: string
  password: string
  confirm_password: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  bio?: string
  otp: string
}

export interface LoginReqBody {
  email: string
  password: string
}

export interface UpdateProfileReqBody {
  name?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  bio?: string
  avatar?: string
}

export interface SendOTPReqBody {
  email: string
  purpose: 'register' | 'reset_password'
}

export interface RefreshTokenReqBody {
  refresh_token: string
}

export interface TokenPayload {
  user_id: string
  token_type: string
  role?: string
  iat: number
  exp: number
}
