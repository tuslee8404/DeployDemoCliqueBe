import { Server as SocketIOServer } from 'socket.io'
import http from 'http'

let io: SocketIOServer

// Lưu trữ mapping giữa user_id (MongoDB) và socket_id hiện tại của họ
const userSocketMap = new Map<string, string>()

export const initSocket = (server: http.Server) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: ['http://localhost:8080', 'https://deploydemocliquefe1.vercel.app'], // Domain Frontend
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    // Lắng nghe khi người dùng đăng nhập và gửi user_id lên cho Socket
    socket.on('register_user', (userId: string) => {
      if (userId) {
        userSocketMap.set(userId, socket.id)
        console.log(`📡 Socket: User ${userId} connected as ${socket.id}`)
      }
    })

    socket.on('disconnect', () => {
      // Tìm và xoá user_id ra khỏi map nếu họ disconnect
      for (const [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId)
          console.log(`🔌 Socket: User ${userId} disconnected`)
          break
        }
      }
    })
  })
}

/**
 * Hàm hỗ trợ bắn Notification tới đúng người nhận nếu họ đang online
 */
export const sendNotification = (receiverId: string, eventName: string, data: any) => {
  if (!io) return

  const socketId = userSocketMap.get(receiverId.toString())
  if (socketId) {
    // Người dùng đang online -> Gửi qua WebSocket
    io.to(socketId).emit(eventName, data)
  }
}
