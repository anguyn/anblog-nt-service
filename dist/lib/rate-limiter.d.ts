interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
}
/**
 * Check if user can resend verification email
 * Config: RATE_LIMIT_VERIFICATION_RESEND (default: 5m)
 * Config: RATE_LIMIT_MAX_VERIFICATION_PER_HOUR (default: 3)
 */
export declare function canResendVerificationEmail(email: string): Promise<RateLimitResult>;
/**
 * Check if user can resend password reset email
 * Config: RATE_LIMIT_PASSWORD_RESET_RESEND (default: 5m)
 * Config: RATE_LIMIT_MAX_PASSWORD_RESET_PER_HOUR (default: 3)
 */
export declare function canResendPasswordReset(email: string): Promise<RateLimitResult>;
/**
 * General email rate limiter per user
 * Config: RATE_LIMIT_MAX_EMAILS_PER_USER_PER_MINUTE (default: 10)
 */
export declare function checkEmailRateLimit(userId: string): Promise<RateLimitResult>;
/**
 * Format retry time in human readable format
 */
export declare function formatRetryAfter(milliseconds: number): string;
export {};
//# sourceMappingURL=rate-limiter.d.ts.map