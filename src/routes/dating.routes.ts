import { Router } from 'express'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'
import { createPostValidator } from '~/middlewares/dating.middlewares'
import {
  listProfilesController,
  getProfileController,
  likeUserController,
  unlikeUserController,
  getMatchesController,
  getLikedMeController,
  createPostController,
  getPostsController,
  getFeedController,
  markPostAsSeenController,
  getNotificationsController,
  submitAvailabilityController,
  confirmAppointmentController,
  getAppointmentsController,
  getScheduleStatusController
} from '~/controllers/dating.controllers'

const datingRouter = Router()

// Tất cả route đều yêu cầu đăng nhập
datingRouter.use(accessTokenValidator)

// ─── PROFILE ──────────────────────────────────────────────────
/**
 * GET /dating/users
 * Lấy danh sách tất cả profile (trừ chính mình)
 */
datingRouter.get('/users', wrapRequestHandler(listProfilesController))

/**
 * GET /dating/users/matches
 * ⚠️ Phải đặt TRƯỚC /users/:id để tránh Express hiểu "matches" là một :id param
 * Lấy danh sách matches của chính mình
 */
datingRouter.get('/users/matches', wrapRequestHandler(getMatchesController))

/**
 * GET /dating/users/liked-me
 * ⚠️ Phải đặt TRƯỚC /users/:id
 * Lấy danh sách người đã tym mình (likedBy)
 */
datingRouter.get('/users/liked-me', wrapRequestHandler(getLikedMeController))

/**
 * GET /dating/users/:id
 * Xem profile chi tiết của 1 người
 */
datingRouter.get('/users/:id', wrapRequestHandler(getProfileController))

// ─── LIKE / UNLIKE ────────────────────────────────────────────
/**
 * POST /dating/users/:id/like
 * Tym người dùng :id → tạo Match nếu 2 chiều
 */
datingRouter.post('/users/:id/like', wrapRequestHandler(likeUserController))

/**
 * DELETE /dating/users/:id/like
 * Bỏ tym (Unlike) — toggle giống Follow/Unfollow của Instagram
 * Nếu đã match trước đó → xóa match 2 chiều
 */
datingRouter.delete('/users/:id/like', wrapRequestHandler(unlikeUserController))

// ─── POST ─────────────────────────────────────────────────────

/**
 * GET /dating/notifications
 * Lấy danh sách thông báo bản thân
 */
datingRouter.get('/notifications', wrapRequestHandler(getNotificationsController))

/**
 * GET /dating/posts/feed
 * Lấy danh sách bài viết trang chủ mới nhất
 * => Phải đặt TRƯỚC các route có /posts/:id để tránh trùng pattern
 */
datingRouter.get('/posts/feed', wrapRequestHandler(getFeedController))

/**
 * POST /dating/posts/:id/seen
 * Đánh dấu bài viết :id đã xem để không hiện trên feed nữa
 */
datingRouter.post('/posts/:id/seen', wrapRequestHandler(markPostAsSeenController))

// ─── DATE SCHEDULING ──────────────────────────────────────────

/**
 * POST /dating/schedule/availability
 * Nộp danh sách thời gian rảnh của user đối với 1 match
 */
datingRouter.post('/schedule/availability', wrapRequestHandler(submitAvailabilityController))

/**
 * POST /dating/schedule/confirm
 * Chốt lịch hẹn hò chính thức sau khi đồng ý slot
 */
datingRouter.post('/schedule/confirm', wrapRequestHandler(confirmAppointmentController))

/**
 * GET /dating/schedule/appointments
 * Lấy lịch hẹn hò đã chốt
 */
datingRouter.get('/schedule/appointments', wrapRequestHandler(getAppointmentsController))

/**
 * GET /dating/schedule/status/:targetUserId
 * Lấy trạng thái lịch hẹn giữa currentUser và targetUser
 */
datingRouter.get('/schedule/status/:targetUserId', wrapRequestHandler(getScheduleStatusController))

/**
 * POST /dating/posts
 * Tạo bài post mới (caption + ảnh)
 */
datingRouter.post('/posts', createPostValidator, wrapRequestHandler(createPostController))

/**
 * GET /dating/posts
 * Lấy post theo ?userId=... hoặc của chính mình nếu không truyền
 */
datingRouter.get('/posts', wrapRequestHandler(getPostsController))

export default datingRouter
