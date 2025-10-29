import { prisma } from '#libs/prisma';
import { config } from '../config';

export class CleanupService {
  /**
   * Xóa users chưa verify email sau thời gian quy định
   *
   * Flow:
   * 1. User đăng ký (Main App tạo User + VerificationToken)
   * 2. Notification Service gửi email verify
   * 3. Sau 7 ngày (hoặc config) nếu chưa verify → Service tự động xóa
   */
  static async cleanupUnverifiedUsers() {
    if (!config.cleanup.cleanupUnverifiedUsers) {
      console.log('⏭️  Unverified user cleanup is disabled');
      return { deleted: 0 };
    }

    try {
      const cutoffDate = new Date(Date.now() - config.cleanup.unverifiedUserRetention);

      console.log(`🔍 Finding unverified users older than ${cutoffDate.toISOString()}`);

      // Find users that:
      // - emailVerified is null (chưa verify)
      // - created before cutoff date
      // - status is PENDING
      const unverifiedUsers = await prisma.user.findMany({
        where: {
          emailVerified: null,
          status: 'PENDING',
          createdAt: {
            lt: cutoffDate,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (unverifiedUsers.length === 0) {
        console.log('✅ No unverified users to cleanup');
        return { deleted: 0, users: [] };
      }

      console.log(`🗑️  Found ${unverifiedUsers.length} unverified users to delete`);

      // Log deleted users if enabled (for audit trail)
      if (config.cleanup.logDeletedUsers) {
        await this.logDeletedUsers(unverifiedUsers, 'UNVERIFIED_EXPIRED');
      }

      // Delete users (cascade will delete related data)
      const result = await prisma.user.deleteMany({
        where: {
          id: {
            in: unverifiedUsers.map((u) => u.id),
          },
        },
      });

      console.log(`✅ Deleted ${result.count} unverified users`);

      return {
        deleted: result.count,
        users: unverifiedUsers.map((u) => ({
          email: u.email,
          createdAt: u.createdAt,
        })),
      };
    } catch (error) {
      console.error('❌ Error cleaning up unverified users:', error);
      throw error;
    }
  }

  /**
   * Xóa các VerificationToken đã hết hạn
   *
   * Note: Token hết hạn nhưng user vẫn tồn tại nếu chưa đến thời gian cleanup
   */
  static async cleanupExpiredVerificationTokens() {
    if (!config.cleanup.cleanupExpiredTokens) {
      console.log('⏭️  Expired token cleanup is disabled');
      return { deleted: 0 };
    }

    try {
      const now = new Date();

      // Delete expired verification tokens
      const result = await prisma.verificationToken.deleteMany({
        where: {
          expires: {
            lt: now,
          },
        },
      });

      console.log(`✅ Deleted ${result.count} expired verification tokens`);

      return { deleted: result.count };
    } catch (error) {
      console.error('❌ Error cleaning up expired tokens:', error);
      throw error;
    }
  }

  /**
   * Xóa các PasswordResetToken đã hết hạn
   */
  static async cleanupExpiredPasswordResetTokens() {
    if (!config.cleanup.cleanupExpiredTokens) {
      return { deleted: 0 };
    }

    try {
      const now = new Date();

      const result = await prisma.passwordResetToken.deleteMany({
        where: {
          expires: {
            lt: now,
          },
        },
      });

      console.log(`✅ Deleted ${result.count} expired password reset tokens`);

      return { deleted: result.count };
    } catch (error) {
      console.error('❌ Error cleaning up expired password reset tokens:', error);
      throw error;
    }
  }

  /**
   * Xóa các EmailSubscription không còn active sau thời gian dài
   */
  static async cleanupInactiveSubscriptions() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6); // 6 months

      const result = await prisma.emailSubscription.deleteMany({
        where: {
          isActive: false,
          unsubscribedAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`✅ Deleted ${result.count} inactive subscriptions`);

      return { deleted: result.count };
    } catch (error) {
      console.error('❌ Error cleaning up inactive subscriptions:', error);
      throw error;
    }
  }

  /**
   * Xóa các EmailLog cũ (optional - for storage optimization)
   */
  static async cleanupOldEmailLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 3); // Keep 3 months

      const result = await prisma.emailLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          status: {
            in: ['SENT', 'BOUNCED'], // Don't delete FAILED for debugging
          },
        },
      });

      console.log(`✅ Deleted ${result.count} old email logs`);

      return { deleted: result.count };
    } catch (error) {
      console.error('❌ Error cleaning up email logs:', error);
      throw error;
    }
  }

  /**
   * Log deleted users to ActivityLog for audit trail
   */
  private static async logDeletedUsers(users: any[], reason: string) {
    try {
      await prisma.activityLog.createMany({
        data: users.map((user) => ({
          action: 'USER_DELETED',
          entity: 'User',
          entityId: user.id,
          importance: 'WARNING',
          metadata: {
            reason,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
            deletedAt: new Date(),
          },
          retentionDays: 365, // Keep for 1 year
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        })),
      });

      console.log(`📝 Logged ${users.length} deleted users to activity log`);
    } catch (error) {
      console.error('❌ Error logging deleted users:', error);
      // Don't throw - logging shouldn't block cleanup
    }
  }

  /**
   * Master cleanup method - run all cleanup tasks
   */
  static async runAllCleanupTasks() {
    console.log('🧹 Starting all cleanup tasks...');

    const results = {
      unverifiedUsers: { deleted: 0 },
      verificationTokens: { deleted: 0 },
      passwordResetTokens: { deleted: 0 },
      inactiveSubscriptions: { deleted: 0 },
      emailLogs: { deleted: 0 },
      activityLogs: { deleted: 0 },
    };

    try {
      // Run all cleanup tasks in parallel
      const [unverifiedUsers, verificationTokens, passwordResetTokens, inactiveSubscriptions, emailLogs] =
        await Promise.allSettled([
          this.cleanupUnverifiedUsers(),
          this.cleanupExpiredVerificationTokens(),
          this.cleanupExpiredPasswordResetTokens(),
          this.cleanupInactiveSubscriptions(),
          this.cleanupOldEmailLogs(),
        ]);

      // Collect results
      if (unverifiedUsers.status === 'fulfilled') {
        results.unverifiedUsers = unverifiedUsers.value;
      }
      if (verificationTokens.status === 'fulfilled') {
        results.verificationTokens = verificationTokens.value;
      }
      if (passwordResetTokens.status === 'fulfilled') {
        results.passwordResetTokens = passwordResetTokens.value;
      }
      if (inactiveSubscriptions.status === 'fulfilled') {
        results.inactiveSubscriptions = inactiveSubscriptions.value;
      }
      if (emailLogs.status === 'fulfilled') {
        results.emailLogs = emailLogs.value;
      }

      // Also cleanup activity logs
      const { PostService } = await import('./post.service');
      const activityLogsResult = await PostService.cleanupActivityLogs();
      results.activityLogs = { deleted: activityLogsResult.count };

      console.log('✅ All cleanup tasks completed:', results);

      return results;
    } catch (error) {
      console.error('❌ Error in cleanup tasks:', error);
      return results;
    }
  }
}
