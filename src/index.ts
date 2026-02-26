import express from 'express'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import cors from 'cors' // ✅ thêm

import databaseService from '~/services/database.services'
import usersRouter from '~/routes/users.routes'
import datingRouter from '~/routes/dating.routes'
import { initSocket } from '~/socket' // Import socket
import http from 'http'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

const allowedOrigins = [
  'http://localhost:8080',
  'https://deploydemocliquefe1.vercel.app',
  'https://deploydemocliquefe1-git-main-tuslee8404s-projects.vercel.app'
]

// ─── Middlewares ───────────────────────────────────────────────

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ─── Routes ───────────────────────────────────────────────────
app.use('/users', usersRouter)
app.use('/dating', datingRouter)

// ─── Health check ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: '🚀 Dating App API is running!', port: PORT })
})

// ─── Global Error Handler ─────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'

  if (err.errors) {
    return res.status(status).json({ message, errors: err.errors })
  }

  res.status(status).json({ message })
})

// ─── Connect DB & Start Server ────────────────────────────────
const httpServer = http.createServer(app)
initSocket(httpServer)

databaseService
  .connect()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  })
