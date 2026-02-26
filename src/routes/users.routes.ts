import { Router } from 'express'
import {
  accessTokenValidator,
  loginValidator,
  registerValidation,
  refreshTokenValidator,
  updateProfileValidator,
  ResetPasswordValidation
} from '~/middlewares/users.middlewares'
import {
  getMeController,
  loginController,
  refreshTokenController,
  getUploadSignatureController,
  updateProfileController,
  logoutController,
  verifyRegisterOTP,
  sendOTPRegister,
  sendOTPResetPassword,
  verifyResetPasswordOTP,
  resetPassword
} from '~/controllers/users.controllers'
import { wrapRequestHandler } from '~/utils/handlers'
import { authUser } from '~/middlewares/usersAuth.middlewares'

const usersRouter = Router()
export default usersRouter

usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))
usersRouter.post('/send-otp-register', registerValidation, wrapRequestHandler(sendOTPRegister))
usersRouter.post('/send-otp-reset-password', wrapRequestHandler(sendOTPResetPassword))
usersRouter.post('/verify-otp-register', registerValidation, wrapRequestHandler(verifyRegisterOTP))
usersRouter.post('/verify-otp-reset-password', wrapRequestHandler(verifyResetPasswordOTP))
usersRouter.post('/reset-password', ResetPasswordValidation, wrapRequestHandler(resetPassword))

/**
 *
 * Desciption: Get my profile
 * Path: /me
 * Method: GET
 * Headers: { Authorization: Bearer <access_token> }
 * Only logged-in users can access
 */
usersRouter.get(
  '/me',
  authUser(['registered', 'paid', 'free', 'admin', 'instructor']),
  accessTokenValidator,
  wrapRequestHandler(getMeController)
)

usersRouter.post('/refresh-token', refreshTokenValidator, wrapRequestHandler(refreshTokenController))

/**
 * Description: Logout
 * Path: /logout
 * Method: POST
 * Headers: { Authorization: Bearer <access_token> }
 */
usersRouter.post('/logout', accessTokenValidator, wrapRequestHandler(logoutController))

/**
 * Description: Get upload signature for Cloudinary
 * Path: /upload-signature
 * Method: GET
 * Headers: { Authorization: Bearer <access_token> }
 * Only logged-in users can access
 */
usersRouter.get(
  '/upload-signature',
  // authUser(['registered', 'paid', 'free', 'admin', 'instructor']),
  accessTokenValidator,
  wrapRequestHandler(getUploadSignatureController)
)

/**
 * Description: Update user profile
 * Path: /update-profile
 * Method: PUT
 * Headers: { Authorization: Bearer <access_token> }
 * Body: { lastname?, firstname?, birthday?, bio?, avatar? }
 * Only logged-in users can access
 */
usersRouter.put(
  '/update-profile',
  // authUser(['registered', 'paid', 'free', 'admin', 'instructor']),
  accessTokenValidator,
  updateProfileValidator,
  wrapRequestHandler(updateProfileController)
)
