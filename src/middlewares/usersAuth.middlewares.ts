import { Request, Response, NextFunction } from 'express'
import { IUser } from '~/models/schemas/User.schema'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import User from '~/models/schemas/User.schema'

/**
 * Middleware factory for role-based authorization.
 * Usage:
 *   app.use('/admin', authUser(['admin']))
 *   usersRouter.post('/login', loginValidator, authUser(), wrapRequestHandler(loginController))
 */
export const authUser = (allowedRoles?: string[]) => async (req: Request, res: Response, next: NextFunction) => {
  const user = (await User.findOne({ 'profile.email': req.body.email })) as IUser

  // 1. User not found (not logged in or missing from request)
  if (!user) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.USER_NOT_FOUND,
      status: HTTP_STATUS.UNAUTHORIZED
    })
  }

  // 2. Account is locked / inactive (if you track that)
  if (!user.isActive) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.USER_IS_INACTIVE,
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  // 3. Role-based authorization
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.PERMISSION_DENIED,
      status: HTTP_STATUS.FORBIDDEN
    })
  }

  // 4. Attach user back to req if you need it downstream
  req.user = user

  // 5. Proceed
  next()
}
