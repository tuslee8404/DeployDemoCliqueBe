import { Request } from 'express'
import { IUser } from './models/schemas/User.schema'
import { TokenPayload } from './models/requests/User.requests'

// Mở rộng interface Request để có thuộc tính user
declare module 'express' {
  interface Request {
    user?: IUser
    decoded_authorization?: TokenPayload
    decoded_refresh_token?: TokenPayload
    decode_email_verify_token?: TokenPayload
    decode_forgot_password_token?: TokenPayload
  }
}
