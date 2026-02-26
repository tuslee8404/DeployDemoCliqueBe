import { on } from 'events'

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  UNPROCESSABLE_ENTITY: 422,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  BAD_REQUEST: 400,
  PARTIAL_CONTENT: 206
} as const //fix cứng, khong cho sửa đổi, không cho phép thay đổi giá trị của object này

export default HTTP_STATUS
