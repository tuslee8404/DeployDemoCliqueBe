import { sendOTPEmail } from '../src/services/email.services'
import dotenv from 'dotenv'
dotenv.config()

async function test() {
  console.log('Testing Resend email...')
  try {
    await sendOTPEmail('leanhtupr3@gmail.com', '123456', 'register')
    console.log('Test email triggered successfully!')
  } catch (error) {
    console.error('Test email failed:', error)
  }
}

test()
