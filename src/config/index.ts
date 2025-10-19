import dotenv from 'dotenv';
import ms from 'ms';
import type { ServerOptions } from 'socket.io';
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || undefined,
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY!,
    from: {
      email: process.env.FROM_EMAIL || 'noreply@example.com',
      name: process.env.FROM_NAME || 'App',
    },
  },

  security: {
    apiSecretKey: process.env.API_SECRET_KEY!,
  },

  mainAppUrl: process.env.MAIN_APP_URL || 'http://localhost:3000',

  rateLimit: {
    verificationResend: ms((process.env.RATE_LIMIT_VERIFICATION_RESEND || '5m') as ms.StringValue),
    passwordResetResend: ms((process.env.RATE_LIMIT_PASSWORD_RESET_RESEND || '5m') as ms.StringValue),
    maxVerificationPerHour: parseInt(process.env.RATE_LIMIT_MAX_VERIFICATION_PER_HOUR || '3'),
    maxPasswordResetPerHour: parseInt(process.env.RATE_LIMIT_MAX_PASSWORD_RESET_PER_HOUR || '3'),
    maxEmailsPerUserPerMinute: parseInt(process.env.RATE_LIMIT_MAX_EMAILS_PER_USER_PER_MINUTE || '10'),
  },

  tokenExpiry: {
    verification: ms((process.env.VERIFICATION_TOKEN_EXPIRY || '24h') as ms.StringValue),
    passwordReset: ms((process.env.PASSWORD_RESET_TOKEN_EXPIRY || '1h') as ms.StringValue),
  },

  socket: {
    cors: {
      origin: process.env.MAIN_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  } as Partial<ServerOptions>, // Type annotation

  jwtSecret: {
    jwtSecretKey: process.env.JWT_SECRET_KEY!,
  },
};
