import { Request, Response, NextFunction } from 'express'
import { TokenPayload } from '~/models/requests/User.requests'
import User from '~/models/schemas/User.schema'
import Post from '~/models/schemas/Post.schema'
import Notification from '~/models/schemas/Notification.schema'
import DateAvailability, { ITimeSlot } from '~/models/schemas/DateAvailability.schema'
import DateAppointment from '~/models/schemas/DateAppointment.schema'
import { sendNotification } from '~/socket'
import mongoose from 'mongoose'

// ─── PROFILE ─────────────────────────────────────────────────

/**
 * GET /dating/users
 * Lấy danh sách tất cả profile (trừ chính mình)
 * Ẩn likedBy để tránh lộ thông tin ai đã tym ai
 */
export const listProfilesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload

    const users = await User.find(
      { _id: { $ne: user_id }, isActive: true },
      'name age gender bio avatar createdAt' // ✅ bỏ likes/likedBy/matches
    )

    res.json({ message: 'Get profiles success', result: users })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /dating/users/:id
 * Xem profile chi tiết của 1 người, kèm theo trạng thái "mình đã tym chưa" hoặc "họ đã tym mình chưa"
 */
export const getProfileController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id: myId } = req.decoded_authorization as TokenPayload
    const targetId = req.params.id as string

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: 'Invalid user id' })
    }

    // Lấy thông tin cả 2 cùng một lúc
    const [me, targetUser] = await Promise.all([
      User.findById(myId, 'likes likedBy matches'),
      User.findOne(
        { _id: targetId, isActive: true },
        'name age gender bio avatar createdAt' // ✅ Không trả về mảng likes/likedBy gốc của target để bảo mật
      )
    ])

    if (!targetUser) return res.status(404).json({ message: 'User not found' })

    // Kiểm tra trạng thái tương tác dựa vào dữ liệu của người xem (me)
    const isLikedByMe = me?.likes.some((id) => id.toString() === targetId) || false
    const hasLikedMe = me?.likedBy.some((id) => id.toString() === targetId) || false
    const isMatch = me?.matches.some((id) => id.toString() === targetId) || false

    const result = {
      ...targetUser.toObject(),
      isLikedByMe,
      hasLikedMe,
      isMatch
    }

    res.json({ message: 'Get profile success', result })
  } catch (error) {
    next(error)
  }
}

// ─── LIKE ─────────────────────────────────────────────────────

/**
 * POST /dating/users/:id/like
 * User hiện tại tym profile của user :id
 * Nếu :id đã tym mình trước đó → tạo match
 */
export const likeUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const targetId = req.params.id as string

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: 'Invalid user id' })
    }

    if (user_id === targetId) {
      return res.status(400).json({ message: 'Không thể tym chính mình' })
    }

    const [me, target] = await Promise.all([User.findById(user_id), User.findById(targetId)])

    if (!me || !target) return res.status(404).json({ message: 'User not found' })

    // Kiểm tra đã tym chưa
    const alreadyLiked = me.likes.some((id) => id.toString() === targetId)
    if (alreadyLiked) {
      return res.status(400).json({ message: 'Bạn đã tym người này rồi' })
    }

    const myObjId = new mongoose.Types.ObjectId(user_id)
    const targetObjId = new mongoose.Types.ObjectId(targetId)

    // Thêm vào likes của mình và likedBy của target
    await Promise.all([
      User.findByIdAndUpdate(user_id, { $addToSet: { likes: targetObjId } }),
      User.findByIdAndUpdate(targetId, { $addToSet: { likedBy: myObjId } })
    ])

    // Kiểm tra match: target đã tym mình trước đó chưa (target có trong likedBy của mình)
    const isMatch = me.likedBy.some((id) => id.toString() === targetId)

    if (isMatch) {
      await Promise.all([
        User.findByIdAndUpdate(user_id, { $addToSet: { matches: targetObjId } }),
        User.findByIdAndUpdate(targetId, { $addToSet: { matches: myObjId } })
      ])

      // 1. Tạo Notification Match cho CẢ 2 người
      const notiForMe = await Notification.create({
        sender: targetObjId,
        receiver: myObjId,
        type: 'match'
      })
      const notiForTarget = await Notification.create({
        sender: myObjId,
        receiver: targetObjId,
        type: 'match'
      })

      // Populate dữ liệu để bắn realtime đi cho đẹp
      await notiForMe.populate('sender', 'name avatar')
      await notiForTarget.populate('sender', 'name avatar')

      // 2. Bắn WebSocket Event Realtime
      sendNotification(user_id, 'receive_notification', notiForMe)
      sendNotification(targetId, 'receive_notification', notiForTarget)

      return res.json({ message: "It's a Match! 💖", isMatch: true })
    }

    // Nếu không match -> Tạo Notification (Like đơn phương) gửi sang Target
    const notiLike = await Notification.create({
      sender: myObjId,
      receiver: targetObjId,
      type: 'like'
    })
    await notiLike.populate('sender', 'name avatar')

    sendNotification(targetId, 'receive_notification', notiLike)

    res.json({ message: 'Tym thành công', isMatch: false })
  } catch (error) {
    next(error)
  }
}

// ─── NOTIFICATIONS ──────────────────────────────────────────────

/**
 * GET /dating/notifications
 * Lấy danh sách thông báo của User hiện tại (mới nhất đẩy lên lịch)
 */
export const getNotificationsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload

    const notifications = await Notification.find({ receiver: new mongoose.Types.ObjectId(user_id) })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(30) // Giới hạn 30 thông báo gần nhất

    res.json({ message: 'Get notifications success', result: notifications })
  } catch (error) {
    next(error)
  }
}

// ─── MATCH ────────────────────────────────────────────────────

/**
 * GET /dating/users/matches
 * Lấy danh sách matches của chính mình (lấy từ token, không phải :id)
 */
export const getMatchesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ Dùng user_id từ token thay vì :id param
    // → chỉ lấy được matches của chính mình, không xem được của người khác
    const { user_id } = req.decoded_authorization as TokenPayload

    const user = await User.findById(user_id).populate('matches', 'name age gender bio avatar')
    if (!user) return res.status(404).json({ message: 'User not found' })

    res.json({ message: 'Get matches success', result: user.matches })
  } catch (error) {
    next(error)
  }
}

// ─── POST ─────────────────────────────────────────────────────

/**
 * POST /dating/posts
 * Tạo bài post mới (caption + ảnh)
 */
export const createPostController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { content, image } = req.body

    if (!content && !image) {
      return res.status(400).json({ message: 'Post phải có nội dung hoặc ảnh' })
    }

    const post = await Post.create({
      user: new mongoose.Types.ObjectId(user_id),
      content: content || '',
      image: image || undefined
    })

    // ✅ Populate user info luôn trước khi trả về
    await post.populate('user', 'name avatar')

    res.status(201).json({ message: 'Tạo post thành công', result: post })
  } catch (error) {
    next(error)
  }
}

export const getPostsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { userId } = req.query

    let targetId: string = user_id

    if (userId) {
      const raw = Array.isArray(userId) ? userId[0] : userId
      if (typeof raw === 'string') {
        targetId = raw
      }
    }
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: 'Invalid userId' })
    }

    const posts = await Post.find({ user: new mongoose.Types.ObjectId(targetId) })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })

    res.json({ message: 'Get posts success', result: posts })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /dating/posts/feed
 * Lấy danh sách bài viết trang chủ mới nhất
 * Loại trừ bài của chính user và bài đã xem (seenPosts)
 */
export const getFeedController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload

    // Lấy user ra để lấy mảng seenPosts
    const currentUser = await User.findById(user_id)
    if (!currentUser) return res.status(404).json({ message: 'User not found' })

    const seenPosts = currentUser.seenPosts || []

    const posts = await Post.find({
      _id: { $nin: seenPosts }, // Bỏ qua các bài đã xem
      user: { $ne: new mongoose.Types.ObjectId(user_id) } // Bỏ qua bài của chính mình
    })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 }) // Sắp xếp mới nhất trên cùng
      .limit(20) // Phân trang đơn giản (limit 20 bài 1 lần request để nhẹ máy)

    res.json({ message: 'Get feed success', result: posts })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /dating/posts/:id/seen
 * Đánh dấu bài viết :id đã xem để không hiện trên feed nữa
 */
export const markPostAsSeenController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const postId = req.params.id as string

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post id' })
    }

    // $addToSet giúp ID không bị add trùng lần thứ 2 nếu lướt qua lại
    await User.findByIdAndUpdate(user_id, {
      $addToSet: { seenPosts: new mongoose.Types.ObjectId(postId) }
    })

    res.json({ message: 'Marked post as seen successfully' })
  } catch (error) {
    next(error)
  }
}

// ─── LIKED ME ─────────────────────────────────────────────────

/**
 * GET /dating/users/liked-me
 * Lấy danh sách người đã tym mình (likedBy)
 * Giúp user biết ai đang quan tâm mình → có thể tym ngược lại
 */
export const getLikedMeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload

    const me = await User.findById(user_id).populate('likedBy', 'name age gender bio avatar')
    if (!me) return res.status(404).json({ message: 'User not found' })

    res.json({ message: 'Get liked-me success', result: me.likedBy })
  } catch (error) {
    next(error)
  }
}

// ─── UNLIKE ───────────────────────────────────────────────────

/**
 * DELETE /dating/users/:id/like
 * Bỏ tym (Unlike) — toggle giống Follow/Unfollow Instagram
 * - Xóa target khỏi likes của mình
 * - Xóa mình khỏi likedBy của target
 * - Nếu trước đó đã match → xóa match 2 chiều
 */
export const unlikeUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const targetId = req.params.id as string

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: 'Invalid user id' })
    }

    if (user_id === targetId) {
      return res.status(400).json({ message: 'Không thể bỏ tym chính mình' })
    }

    const me = await User.findById(user_id)
    if (!me) return res.status(404).json({ message: 'User not found' })

    // Kiểm tra có đang tym không
    const hasLiked = me.likes.some((id) => id.toString() === targetId)
    if (!hasLiked) {
      return res.status(400).json({ message: 'Bạn chưa tym người này' })
    }

    const myObjId = new mongoose.Types.ObjectId(user_id)
    const targetObjId = new mongoose.Types.ObjectId(targetId)

    // Trước đó đã match không?
    const wasMatched = me.matches.some((id) => id.toString() === targetId)

    // Xóa tym + likedBy
    const updates: Promise<any>[] = [
      User.findByIdAndUpdate(user_id, { $pull: { likes: targetObjId } }),
      User.findByIdAndUpdate(targetId, { $pull: { likedBy: myObjId } })
    ]

    // Nếu đã match → xóa match 2 chiều
    if (wasMatched) {
      updates.push(
        User.findByIdAndUpdate(user_id, { $pull: { matches: targetObjId } }),
        User.findByIdAndUpdate(targetId, { $pull: { matches: myObjId } })
      )
    }

    await Promise.all(updates)

    res.json({
      message: 'Đã bỏ tym thành công',
      matchRemoved: wasMatched
    })
  } catch (error) {
    next(error)
  }
}

// ─── DATE SCHEDULING ──────────────────────────────────────────

/**
 * Hàm phụ trợ kiểm tra 2 khoảng thời gian có giao nhau không và trả về khoảng giao
 * Trả về null nếu không giao hoặc giao nhau < 30 phút (tuỳ logic)
 */
const getIntersection = (slotA: ITimeSlot, slotB: ITimeSlot): ITimeSlot | null => {
  if (slotA.date !== slotB.date) return null

  // Chuyển "HH:mm" thành số phút từ 00:00 để dễ so sánh
  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }
  const toTimeStr = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const startA = toMinutes(slotA.startTime)
  const endA = toMinutes(slotA.endTime)
  const startB = toMinutes(slotB.startTime)
  const endB = toMinutes(slotB.endTime)

  // Khoảng giao nhau
  const intersectStart = Math.max(startA, startB)
  const intersectEnd = Math.min(endA, endB)

  // Phải giao nhau ít nhất 30 phút rảnh chung mới hẹn được
  if (intersectEnd - intersectStart >= 30) {
    return {
      date: slotA.date,
      startTime: toTimeStr(intersectStart),
      endTime: toTimeStr(intersectEnd)
    }
  }

  return null
}

/**
 * Hàm phụ trợ: Kiểm tra xem slot chung này có trùng với lịch sử đã có của user không
 */
const checkConflict = async (userId: string, targetId: string, slot: ITimeSlot) => {
  // Tìm các lịch hẹn của userId và targetId trong cùng một ngày
  const appointments = await DateAppointment.find({
    $or: [{ user1: { $in: [userId, targetId] } }, { user2: { $in: [userId, targetId] } }],
    date: slot.date,
    status: 'scheduled'
  }).populate('user1 user2', 'name')

  const warnings: string[] = []

  const slotStart = slot.startTime
  const slotEnd = slot.endTime

  for (const app of appointments) {
    // Nếu có lịch hẹn nằm đè lên khoảng giao chung
    if (Math.max(app.startTime as any, slotStart as any) < Math.min(app.endTime as any, slotEnd as any)) {
      // Tìm xem lịch này là của ai
      const isMyConflict = app.user1._id.toString() === userId || app.user2._id.toString() === userId
      const isTargetConflict = app.user1._id.toString() === targetId || app.user2._id.toString() === targetId

      if (isMyConflict) {
        const otherPerson = app.user1._id.toString() === userId ? (app.user2 as any).name : (app.user1 as any).name
        warnings.push(`Bạn đã có lịch hẹn với ${otherPerson} vào ${app.startTime}-${app.endTime} ngày ${app.date}.`)
      }
      if (isTargetConflict) {
        // Cảnh báo thôi, không nói rõ tên người thứ 3 để bảo mật cho target
        warnings.push(`Đối phương đã có lịch hẹn khác vào khung giờ này.`)
      }
    }
  }

  return warnings
}

/**
 * POST /dating/schedule/availability
 * Nộp danh sách thời gian rảnh của user đối với 1 match
 */
export const submitAvailabilityController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { targetUserId, slots } = req.body // slots: ITimeSlot[]

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: 'Invalid target user id' })
    }

    // 1. Lưu/Cập nhật availability của mình
    await DateAvailability.findOneAndUpdate({ userId: user_id, targetUserId }, { slots }, { upsert: true, new: true })

    // 2. Lấy availability của đối phương đối với mình
    const targetAvail = await DateAvailability.findOne({ userId: targetUserId, targetUserId: user_id })

    if (!targetAvail || !targetAvail.slots || targetAvail.slots.length === 0) {
      return res.json({
        message: 'Đã lưu thời gian rảnh. Đang chờ đối phương chọn lịch.',
        isMatched: false
      })
    }

    // 3. Tìm khoảng giao đầu tiên (First Common Slot)
    let firstCommonSlot: ITimeSlot | null = null
    for (const mySlot of slots) {
      for (const targetSlot of targetAvail.slots) {
        const intersected = getIntersection(mySlot, targetSlot)
        if (intersected) {
          firstCommonSlot = intersected
          break
        }
      }
      if (firstCommonSlot) break
    }

    if (!firstCommonSlot) {
      return res.json({
        message: 'Chưa tìm được thời gian trùng. Vui lòng chọn lại.',
        isMatched: false
      })
    }

    // 4. Nếu có common slot, kiểm tra xem có xung đột với lịch hẹn cũ không
    const conflictWarnings = await checkConflict(user_id, targetUserId, firstCommonSlot)

    // 5. Trả về kết quả để Client hỏi ý kiến chốt lịch "Confirm"
    return res.json({
      message: 'Đã tìm thấy thời gian hẹn hò phù hợp!',
      isMatched: true,
      commonSlot: firstCommonSlot,
      conflictWarnings // Mảng các câu cảnh báo đụng lịch
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /dating/schedule/confirm
 * Sau khi gọi API availability và có commonSlot (dù có warning hay không), Client gọi API này để chốt lịch
 */
export const confirmAppointmentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { targetUserId, date, startTime, endTime } = req.body

    const appointment = await DateAppointment.create({
      user1: user_id,
      user2: targetUserId,
      date,
      startTime,
      endTime,
      status: 'scheduled'
    })

    // Xoá Availability tạm sau khi đã chốt để đỡ rác Db
    await DateAvailability.deleteMany({
      $or: [
        { userId: user_id, targetUserId },
        { userId: targetUserId, targetUserId: user_id }
      ]
    })

    // Bắn socket thông báo cho cả 2
    sendNotification(targetUserId, 'receive_notification', {
      type: 'date_scheduled',
      sender: { name: 'Hệ thống' }
    })

    res.json({ message: 'Đã chốt lịch hẹn thành công!', result: appointment })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /dating/schedule/appointments
 * Lấy lịch hẹn hò đã chốt
 */
export const getAppointmentsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload

    const appointments = await DateAppointment.find({
      $or: [{ user1: user_id }, { user2: user_id }],
      status: 'scheduled'
    })
      .populate('user1 user2', 'name avatar')
      .sort({ date: 1, startTime: 1 })

    res.json({ message: 'Get appointments success', result: appointments })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /dating/schedule/status/:targetUserId
 * Kéo trạng thái hẹn hò hiện tại với 1 người (Đã có lịch chưa? Hay đang chờ availability?)
 */
export const getScheduleStatusController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const targetUserId = req.params.targetUserId as string

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: 'Invalid target user id' })
    }

    // 1. Kiểm tra xem 2 người đã có lịch hẹn chốt chưa
    const appointment = await DateAppointment.findOne({
      $or: [
        { user1: user_id, user2: targetUserId },
        { user1: targetUserId, user2: user_id }
      ],
      status: 'scheduled'
    }).populate('user1 user2', 'name avatar')

    if (appointment) {
      return res.json({ message: 'Đã có lịch hẹn', result: { type: 'appointment', data: appointment } })
    }

    // 2. Nếu chưa có lịch chốt, kiểm tra xem mình đã gửi availability chưa
    const myAvail = await DateAvailability.findOne({ userId: user_id, targetUserId })

    // Và kiểm tra đối phương đã gửi chưa (tuỳ chọn)
    const partnerAvail = await DateAvailability.findOne({ userId: targetUserId, targetUserId: user_id })

    return res.json({
      message: 'Chưa chốt lịch',
      result: {
        type: 'pending_availability',
        myAvailability: myAvail ? myAvail.slots : [],
        partnerHasSubmitted: !!partnerAvail
      }
    })
  } catch (error) {
    next(error)
  }
}
