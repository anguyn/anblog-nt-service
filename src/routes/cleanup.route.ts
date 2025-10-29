import { Router } from 'express';
import { prisma } from '#libs/prisma';
import { config } from '../config';
import { CleanupService } from '#services/cleanup.service';

const router = Router();

/**
 * POST /api/cleanup/unverified-users
 * Manually trigger unverified users cleanup
 */
router.post('/unverified-users', async (req, res) => {
  try {
    const result = await CleanupService.cleanupUnverifiedUsers();
    res.json({
      success: true,
      message: `Deleted ${result.deleted} unverified users`,
      ...result,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

/**
 * POST /api/cleanup/expired-tokens
 * Manually trigger expired tokens cleanup
 */
router.post('/expired-tokens', async (req, res) => {
  try {
    const [verification, passwordReset] = await Promise.all([
      CleanupService.cleanupExpiredVerificationTokens(),
      CleanupService.cleanupExpiredPasswordResetTokens(),
    ]);

    res.json({
      success: true,
      deleted: {
        verificationTokens: verification.deleted,
        passwordResetTokens: passwordReset.deleted,
        total: verification.deleted + passwordReset.deleted,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

/**
 * POST /api/cleanup/all
 * Run all cleanup tasks
 */
router.post('/all', async (req, res) => {
  try {
    const results = await CleanupService.runAllCleanupTasks();
    res.json({
      success: true,
      message: 'All cleanup tasks completed',
      results,
    });
  } catch (error) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

/**
 * GET /api/cleanup/stats
 * Get cleanup statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const cutoffDate = new Date(Date.now() - config.cleanup.unverifiedUserRetention);

    const [unverifiedCount, expiredTokensCount, expiredResetTokensCount] = await Promise.all([
      prisma.user.count({
        where: {
          emailVerified: null,
          status: 'PENDING',
          createdAt: { lt: cutoffDate },
        },
      }),
      prisma.verificationToken.count({
        where: { expires: { lt: new Date() } },
      }),
      prisma.passwordResetToken.count({
        where: { expires: { lt: new Date() } },
      }),
    ]);

    res.json({
      pendingCleanup: {
        unverifiedUsers: unverifiedCount,
        expiredVerificationTokens: expiredTokensCount,
        expiredPasswordResetTokens: expiredResetTokensCount,
      },
      config: {
        unverifiedUserRetention: config.cleanup.unverifiedUserRetention,
        cleanupEnabled: config.cleanup.cleanupUnverifiedUsers,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
