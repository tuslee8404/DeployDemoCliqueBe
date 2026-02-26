// src/services/email.service.ts
import nodemailer from 'nodemailer'
import { envConfig } from '~/constants/config'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // dùng STARTTLS với port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // 👈 Thêm dòng này để bỏ qua lỗi chứng chỉ tự ký
  }
})

export const sendOTPEmail = async (email: string, otp: string, purpose: 'register' | 'reset_password') => {
  const subject = purpose === 'register' ? 'Xác nhận đăng ký tài khoản' : 'Đặt lại mật khẩu'
  const title = purpose === 'register' ? 'Xác nhận đăng ký' : 'Đặt lại mật khẩu'

  const mailOptions = {
    from: envConfig.emailFrom || envConfig.emailUser,
    to: email,
    subject: subject,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              ${
                purpose === 'register'
                  ? 'Cảm ơn bạn đã đăng ký tài khoản tại Clique83 !'
                  : 'Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.'
              }
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 30px;">
              Mã OTP của bạn là:
            </p>
            
            <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
              <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${otp}</span>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              ⏰ Mã OTP này có hiệu lực trong <strong>5 phút</strong>
            </p>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              🔒 Vui lòng không chia sẻ mã này với bất kỳ ai
            </p>
            
            <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
              </p>
              <p style="font-size: 12px; color: #999; text-align: center; margin: 10px 0 0 0;">
                © 2026 Dating Website
              </p>
            </div>
          </div>
        </div>
      `
  }

  try {
    await transporter.sendMail(mailOptions)
    //console.log('✅ Email sent to:', email)
  } catch (error) {
    console.error('❌ Email send error:', error)
    throw new Error('Failed to send OTP email')
  }
}
