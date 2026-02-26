export enum UserVerifyStatus {
  Unverified, //chưa xác thực email, mặc định =0
  Verified, // đã xác thực email
  Banned // bị khoá
}

export enum TokenType {
  AccessToken,
  RefreshToken,
  ForgotPasswordToken,
  EmailVerifyToken
}

export enum MediaType {
  Image,
  Video
}

export enum UserRole {
  Admin = 'admin',
  Staff = 'staff',
  User = 'user',
  Registered = 'registered',
  Paid = 'paid',
  Free = 'free',
  Instructor = 'instructor'
}
