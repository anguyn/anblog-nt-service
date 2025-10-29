import { redis } from './redis';
import { config } from '../config';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // milliseconds
}

/**
 * Check if user can resend verification email
 * Config: RATE_LIMIT_VERIFICATION_RESEND (default: 5m)
 * Config: RATE_LIMIT_MAX_VERIFICATION_PER_HOUR (default: 3)
 */
export async function canResendVerificationEmail(email: string): Promise<RateLimitResult> {
  const cooldownKey = `rate_limit:verification:cooldown:${email}`;
  const hourlyKey = `rate_limit:verification:hourly:${email}`;

  // Check cooldown (minimum time between resends)
  const lastSent = await redis.get(cooldownKey);
  if (lastSent) {
    const timeSinceLastSend = Date.now() - parseInt(lastSent);
    const cooldown = config.rateLimit.verificationResend;

    if (timeSinceLastSend < cooldown) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(parseInt(lastSent) + cooldown),
        retryAfter: cooldown - timeSinceLastSend,
      };
    }
  }

  // Check hourly limit
  const hourlyCount = await redis.get(hourlyKey);
  const maxPerHour = config.rateLimit.maxVerificationPerHour;

  if (hourlyCount && parseInt(hourlyCount) >= maxPerHour) {
    const ttl = await redis.ttl(hourlyKey);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + ttl * 1000),
      retryAfter: ttl * 1000,
    };
  }

  // Allow and update counters
  const now = Date.now();
  await redis.set(cooldownKey, now.toString(), 'PX', config.rateLimit.verificationResend);

  const newCount = await redis.incr(hourlyKey);
  if (newCount === 1) {
    await redis.expire(hourlyKey, 3600); // 1 hour
  }

  return {
    allowed: true,
    remaining: maxPerHour - newCount,
    resetAt: new Date(now + 3600 * 1000),
  };
}

/**
 * Check if user can resend password reset email
 * Config: RATE_LIMIT_PASSWORD_RESET_RESEND (default: 5m)
 * Config: RATE_LIMIT_MAX_PASSWORD_RESET_PER_HOUR (default: 3)
 */
export async function canResendPasswordReset(email: string): Promise<RateLimitResult> {
  const cooldownKey = `rate_limit:password_reset:cooldown:${email}`;
  const hourlyKey = `rate_limit:password_reset:hourly:${email}`;

  const lastSent = await redis.get(cooldownKey);
  if (lastSent) {
    const timeSinceLastSend = Date.now() - parseInt(lastSent);
    const cooldown = config.rateLimit.passwordResetResend;

    if (timeSinceLastSend < cooldown) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(parseInt(lastSent) + cooldown),
        retryAfter: cooldown - timeSinceLastSend,
      };
    }
  }

  const hourlyCount = await redis.get(hourlyKey);
  const maxPerHour = config.rateLimit.maxPasswordResetPerHour;

  if (hourlyCount && parseInt(hourlyCount) >= maxPerHour) {
    const ttl = await redis.ttl(hourlyKey);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + ttl * 1000),
      retryAfter: ttl * 1000,
    };
  }

  const now = Date.now();
  await redis.set(cooldownKey, now.toString(), 'PX', config.rateLimit.passwordResetResend);

  const newCount = await redis.incr(hourlyKey);
  if (newCount === 1) {
    await redis.expire(hourlyKey, 3600);
  }

  return {
    allowed: true,
    remaining: maxPerHour - newCount,
    resetAt: new Date(now + 3600 * 1000),
  };
}

/**
 * General email rate limiter per user
 * Config: RATE_LIMIT_MAX_EMAILS_PER_USER_PER_MINUTE (default: 10)
 */
export async function checkEmailRateLimit(userId: string): Promise<RateLimitResult> {
  const key = `rate_limit:email:user:${userId}`;
  const limit = config.rateLimit.maxEmailsPerUserPerMinute;
  const window = 60; // 60 seconds

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + ttl * 1000),
      retryAfter: ttl * 1000,
    };
  }

  return {
    allowed: true,
    remaining: limit - count,
    resetAt: new Date(Date.now() + ttl * 1000),
  };
}

/**
 * Format retry time in human readable format
 */
export function formatRetryAfter(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds} giây`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const hours = Math.ceil(minutes / 60);
  return `${hours} giờ`;
}
