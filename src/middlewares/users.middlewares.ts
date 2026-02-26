import { check, checkSchema, ParamSchema } from 'express-validator'
import { USERS_MESSAGES } from '~/constants/messages'
import databaseService from '~/services/database.services'
import { validate } from '~/utils/validation'
import User from '~/models/schemas/User.schema'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { hashPassword } from '~/utils/crypto'
import { config } from 'dotenv'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { verifyToken } from '~/utils/jwt'
import { JsonWebTokenError } from 'jsonwebtoken'
import usersService from '~/services/users.services'
import { Request } from 'express'
config()

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        custom: {
          options: async (value, { req }) => {
            // ✅ Từ: User.findOne({ 'profile.email': value })
            // ✅ Thành:
            const user = await User.findOne({ email: value, isActive: true })
            if (!user) throw new Error(USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT)

            const hashedPassword = hashPassword(req.body.password)
            if (user.password !== hashedPassword) throw new Error(USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT)

            req.user = user
            return true
          }
        }
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
        },
        isLength: {
          options: { min: 6, max: 50 },
          errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_6_TO_100
        },
        isStrongPassword: {
          options: {
            minLength: 6,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
            returnScore: false
          }
        },
        errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
      }
    },
    ['body']
  )
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        custom: {
          options: async (value: string, { req }) => {
            const access_token = (value || '').split(' ')[1] //giải thích trong notion
            if (!access_token) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            try {
              const decoded_authorization = await verifyToken({
                token: access_token,
                secretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              })
              //console.log('AccessTokenValidator - Token decoded successfully for user:', decoded_authorization.user_id)
              req.decoded_authorization = decoded_authorization
            } catch (error) {
              //console.error('AccessTokenValidator - Token verification failed:', (error as Error).message)
              throw new ErrorWithStatus({
                message: (error as JsonWebTokenError).message,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            return true
          }
        }
      }
    },
    ['headers']
  )
)

export const registerValidation = validate(
  checkSchema(
    {
      email: {
        notEmpty: { errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED },
        isEmail: { errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID },
        trim: true,
        toLowerCase: true
      },
      otp: {
        optional: true,
        isString: true
      },
      name: {
        notEmpty: { errorMessage: 'Tên không được để trống' },
        isString: true,
        isLength: { options: { min: 2, max: 100 }, errorMessage: 'Tên từ 2-100 ký tự' },
        trim: true
      },
      age: {
        notEmpty: { errorMessage: 'Tuổi không được để trống' },
        isInt: { options: { min: 18 }, errorMessage: 'Phải từ 18 tuổi trở lên' },
        toInt: true
      },
      gender: {
        notEmpty: { errorMessage: 'Giới tính không được để trống' },
        isIn: { options: [['male', 'female', 'other']], errorMessage: 'Giới tính không hợp lệ' }
      },
      bio: {
        optional: true,
        isString: true,
        isLength: { options: { max: 500 }, errorMessage: 'Bio tối đa 500 ký tự' },
        trim: true
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
        },
        isString: { errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRING },
        isLength: { options: { min: 6, max: 100 }, errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_6_TO_100 },
        isStrongPassword: {
          options: { minSymbols: 1, minUppercase: 1, minNumbers: 1 },
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
        }
      },
      confirm_password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
        },
        isString: { errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRING },
        isLength: {
          options: { min: 6, max: 100 },
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_6_TO_100
        },
        isStrongPassword: {
          options: { minSymbols: 1, minUppercase: 1, minNumbers: 1 },
          errorMessage: USERS_MESSAGES.CONFRIM_PASSWORD_MUST_BE_STRONG
        },
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.password) {
              throw new Error(USERS_MESSAGES.CONFIRM_PASSWORD_DOES_NOT_MATCH)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const ResetPasswordValidation = validate(
  checkSchema(
    {
      new_password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
        },
        isString: { errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRING },
        isLength: { options: { min: 6, max: 100 }, errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_6_TO_100 },
        isStrongPassword: {
          options: { minSymbols: 1, minUppercase: 1, minNumbers: 1 },
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
        }
      },
      confirm_password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
        },
        isString: { errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRING },
        isLength: {
          options: { min: 6, max: 100 },
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_6_TO_100
        },
        isStrongPassword: {
          options: { minSymbols: 1, minUppercase: 1, minNumbers: 1 },
          errorMessage: USERS_MESSAGES.CONFRIM_PASSWORD_MUST_BE_STRONG
        },
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.new_password) {
              throw new Error(USERS_MESSAGES.CONFIRM_PASSWORD_DOES_NOT_MATCH)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refreshToken: {
        custom: {
          options: async (value, { req }) => {
            // Kiểm tra chắc chắn cookies đã được parse
            if (!req.cookies) {
              throw new ErrorWithStatus({
                message: 'Cookies chưa được parse, hãy chắc chắn đã dùng cookie-parser middleware!',
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            const refreshTokenValue = req.cookies.refreshToken
            if (!refreshTokenValue) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.REFRESH_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }
            try {
              const [decode_refresh_token, refresh_token] = await Promise.all([
                verifyToken({
                  token: refreshTokenValue,
                  secretOrPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
                }),
                RefreshToken.findOne({ refreshtoken: refreshTokenValue })
              ])
              if (!refresh_token) {
                throw new ErrorWithStatus({
                  message: USERS_MESSAGES.USED_REFRESH_TOKEN_OR_NOT_EXIST,
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              req.decoded_refresh_token = decode_refresh_token
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: error.message,
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              throw error
            }
            return true
          }
        }
      }
    },
    ['cookies']
  )
)

export const updateProfileValidator = validate(
  checkSchema({
    lastname: {
      optional: true,
      isString: {
        errorMessage: USERS_MESSAGES.NAME_MUST_BE_STRING
      },
      trim: true,
      isLength: {
        options: { min: 1, max: 100 },
        errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_1_TO_100
      }
    },
    firstname: {
      optional: true,
      isString: {
        errorMessage: USERS_MESSAGES.NAME_MUST_BE_STRING
      },
      trim: true,
      isLength: {
        options: { min: 1, max: 100 },
        errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_1_TO_100
      }
    },
    birthday: {
      optional: true,
      isISO8601: {
        options: { strict: true, strictSeparator: true },
        errorMessage: USERS_MESSAGES.DATE_OF_BIRTH_MUST_BE_ISO8601
      }
    },
    phone: {
      optional: true,
      isString: {
        errorMessage: USERS_MESSAGES.PHONE_MUST_BE_STRING
      },
      custom: {
        options: (value) => {
          // Cho phép trống hoặc phải đúng format
          if (!value || value.trim() === '') {
            return true
          }
          if (!/^\+?[0-9]\d{1,14}$/.test(value)) {
            throw new Error(USERS_MESSAGES.PHONE_IS_INVALID)
          }
          return true
        }
      }
    },
    avatar: {
      optional: true,
      isString: {
        errorMessage: USERS_MESSAGES.IMAGE_URL_MUST_BE_STRING
      },
      trim: true,
      isLength: {
        options: { min: 1, max: 400 },
        errorMessage: USERS_MESSAGES.IMAGE_URL_LENGTH
      }
    }
  })
)
