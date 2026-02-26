import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const createPostValidator = validate(
  checkSchema(
    {
      content: {
        optional: true,
        isString: { errorMessage: 'Content phải là string' },
        isLength: {
          options: { max: 2000 },
          errorMessage: 'Content tối đa 2000 ký tự'
        },
        trim: true
      },
      image: {
        optional: true,
        isString: { errorMessage: 'Image phải là string URL' },
        isURL: { errorMessage: 'Image phải là URL hợp lệ' }
      }
    },
    ['body']
  )
)
