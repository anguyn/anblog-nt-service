import { Translations } from './types';

export const translations: Translations = {
  // Email subjects
  'email.verification.subject': {
    vi: 'Xác nhận email của bạn',
    en: 'Verify your email',
  },
  'email.passwordReset.subject': {
    vi: 'Đặt lại mật khẩu',
    en: 'Reset your password',
  },
  'email.welcome.subject': {
    vi: 'Chào mừng bạn!',
    en: 'Welcome!',
  },
  'email.newPost.subject': {
    vi: 'Bài viết mới từ {authorName}',
    en: 'New post from {authorName}',
  },

  // Common phrases
  'common.hello': {
    vi: 'Xin chào',
    en: 'Hello',
  },
  'common.thankYou': {
    vi: 'Cảm ơn bạn',
    en: 'Thank you',
  },
  'common.success': {
    vi: 'Thành công',
    en: 'Success',
  },
  'common.error': {
    vi: 'Lỗi',
    en: 'Error',
  },

  // Verification email
  'verification.greeting': {
    vi: 'Xin chào {name},',
    en: 'Hello {name},',
  },
  'verification.message': {
    vi: 'Cảm ơn bạn đã đăng ký! Vui lòng xác nhận địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:',
    en: 'Thank you for signing up! Please verify your email address by clicking the button below:',
  },
  'verification.button': {
    vi: 'Xác nhận Email',
    en: 'Verify Email',
  },
  'verification.expiry': {
    vi: 'Link này sẽ hết hạn sau 24 giờ.',
    en: 'This link will expire in 24 hours.',
  },

  // Password reset
  'passwordReset.greeting': {
    vi: 'Xin chào {name},',
    en: 'Hello {name},',
  },
  'passwordReset.message': {
    vi: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.',
    en: 'We received a request to reset your password.',
  },
  'passwordReset.button': {
    vi: 'Đặt lại mật khẩu',
    en: 'Reset Password',
  },
  'passwordReset.expiry': {
    vi: 'Link này sẽ hết hạn sau 1 giờ.',
    en: 'This link will expire in 1 hour.',
  },
  'passwordReset.securityNotice': {
    vi: 'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.',
    en: 'If you did not request a password reset, please ignore this email.',
  },

  // Welcome email
  'welcome.greeting': {
    vi: 'Xin chào {name},',
    en: 'Hello {name},',
  },
  'welcome.message': {
    vi: 'Cảm ơn bạn đã xác nhận email. Tài khoản của bạn đã được kích hoạt!',
    en: 'Thank you for verifying your email. Your account is now active!',
  },

  // Rate limit messages
  'rateLimit.verification': {
    vi: 'Vui lòng đợi {time} trước khi gửi lại email xác thực',
    en: 'Please wait {time} before resending verification email',
  },
  'rateLimit.passwordReset': {
    vi: 'Vui lòng đợi {time} trước khi yêu cầu đặt lại mật khẩu',
    en: 'Please wait {time} before requesting password reset',
  },
  'rateLimit.tooManyEmails': {
    vi: 'Bạn đã gửi quá nhiều email. Vui lòng đợi {time}',
    en: 'You have sent too many emails. Please wait {time}',
  },
  'rateLimit.exceeded': {
    vi: 'Vượt quá giới hạn',
    en: 'Rate limit exceeded',
  },

  // API Response messages
  'api.email.queued': {
    vi: 'Email đã được đưa vào hàng đợi thành công',
    en: 'Email queued successfully',
  },
  'api.email.bulkQueued': {
    vi: '{count} email đã được đưa vào hàng đợi thành công',
    en: '{count} emails queued successfully',
  },
  'api.email.failed': {
    vi: 'Không thể đưa email vào hàng đợi',
    en: 'Failed to queue email',
  },
  'api.notification.sent': {
    vi: 'Thông báo đã được gửi đến user {userId}',
    en: 'Notification sent to user {userId}',
  },
  'api.notification.failed': {
    vi: 'Không thể gửi thông báo test',
    en: 'Failed to send test notification',
  },
  'api.broadcast.sent': {
    vi: 'Đã gửi broadcast',
    en: 'Broadcast sent',
  },
  'api.broadcast.failed': {
    vi: 'Không thể broadcast',
    en: 'Failed to broadcast',
  },

  // Validation messages
  'validation.required': {
    vi: 'Trường này là bắt buộc',
    en: 'This field is required',
  },
  'validation.invalidEmail': {
    vi: 'Email không hợp lệ',
    en: 'Invalid email address',
  },
  'validation.invalidRequest': {
    vi: 'Yêu cầu không hợp lệ',
    en: 'Invalid request',
  },
  'validation.mustProvideHtmlOrTemplate': {
    vi: 'Phải cung cấp html/text hoặc template',
    en: 'Must provide either html/text or template',
  },
  'validation.templateRequiresData': {
    vi: 'Template cần có object data',
    en: 'Template requires data object',
  },
  'validation.emailsArray': {
    vi: 'emails phải là một mảng',
    en: 'emails must be an array',
  },
  'validation.emailsNotEmpty': {
    vi: 'Mảng emails không được trống',
    en: 'emails array cannot be empty',
  },
  'validation.maxBulkEmails': {
    vi: 'Tối đa 1000 email mỗi lần',
    en: 'Maximum 1000 emails per batch',
  },
  'validation.userIdRequired': {
    vi: 'userId là bắt buộc',
    en: 'userId is required',
  },

  // Monitoring messages
  'monitoring.stats.failed': {
    vi: 'Không thể lấy thống kê',
    en: 'Failed to get stats',
  },
  'monitoring.jobs.failed': {
    vi: 'Không thể lấy danh sách failed jobs',
    en: 'Failed to get failed jobs',
  },
  'monitoring.jobs.waiting': {
    vi: 'Không thể lấy danh sách waiting jobs',
    en: 'Failed to get waiting jobs',
  },
  'monitoring.job.notFound': {
    vi: 'Không tìm thấy job',
    en: 'Job not found',
  },
  'monitoring.job.retryQueued': {
    vi: 'Job đã được đưa vào hàng đợi để thử lại',
    en: 'Job queued for retry',
  },
  'monitoring.job.retryFailed': {
    vi: 'Không thể thử lại job',
    en: 'Failed to retry job',
  },
  'monitoring.jobs.retriedCount': {
    vi: 'Đã thử lại {count} failed jobs',
    en: 'Retried {count} failed jobs',
  },
  'monitoring.jobs.retryAllFailed': {
    vi: 'Không thể thử lại jobs',
    en: 'Failed to retry jobs',
  },
  'monitoring.job.removed': {
    vi: 'Đã xóa job',
    en: 'Job removed',
  },
  'monitoring.job.removeFailed': {
    vi: 'Không thể xóa job',
    en: 'Failed to remove job',
  },
  'monitoring.jobs.cleaned': {
    vi: 'Đã dọn dẹp {count} {status} jobs',
    en: 'Cleaned {count} {status} jobs',
  },
  'monitoring.jobs.cleanFailed': {
    vi: 'Không thể dọn dẹp jobs',
    en: 'Failed to clean jobs',
  },
  'monitoring.job.detailsFailed': {
    vi: 'Không thể lấy chi tiết job',
    en: 'Failed to get job details',
  },

  // Health check messages
  'health.healthy': {
    vi: 'Khỏe mạnh',
    en: 'healthy',
  },
  'health.unhealthy': {
    vi: 'Không khỏe mạnh',
    en: 'unhealthy',
  },
  'health.checkFailed': {
    vi: 'Kiểm tra service thất bại',
    en: 'Service check failed',
  },
  'health.redis.connected': {
    vi: 'đã kết nối',
    en: 'connected',
  },
  'health.redis.disconnected': {
    vi: 'chưa kết nối',
    en: 'disconnected',
  },

  // Time units
  'time.seconds': {
    vi: '{count} giây',
    en: '{count} seconds',
  },
  'time.minutes': {
    vi: '{count} phút',
    en: '{count} minutes',
  },
  'time.hours': {
    vi: '{count} giờ',
    en: '{count} hours',
  },
  'time.days': {
    vi: '{count} ngày',
    en: '{count} days',
  },
};
