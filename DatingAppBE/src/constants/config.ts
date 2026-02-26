import argv from 'minimist'
const options = argv(process.argv.slice(2))

export const isProduction = Boolean(options.production)

export const envConfig = {
  port: process.env.PORT || 3001,
  dbName: process.env.DB_NAME,
  dbUsername: process.env.DB_USERNAME,
  dbPassword: process.env.DB_PASSWORD,
  dbHost: process.env.DB_HOST,
  secretKey: process.env.SECRET_KEY,
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  emailFrom: process.env.EMAIL_FROM
}
