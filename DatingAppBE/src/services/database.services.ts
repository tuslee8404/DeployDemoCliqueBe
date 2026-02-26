import mongoose, { Collection } from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@clusterdatingapp.zhmqmc6.mongodb.net/?appName=ClusterDatingApp`

class DatabaseService {
  private isConnected: boolean

  constructor() {
    this.isConnected = false
  }

  async connect() {
    try {
      if (!this.isConnected) {
        await mongoose.connect(uri)
        this.isConnected = true
        console.log('Connected to MongoDB with Mongoose!')
      }
    } catch (error) {
      console.error(' MongoDB connection error:', error)
      throw error
    }
  }
}

const databaseService = new DatabaseService()
export default databaseService
