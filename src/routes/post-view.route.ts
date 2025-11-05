import { Router } from 'express';
import { manualViewSync } from '#src/jobs';
import { getViewStats } from '#sockets/handlers/post-view.handler';

const router = Router();

// Manual sync endpoint (should be protected in production)
router.post('/sync', async (req, res) => {
  try {
    // Add authentication check here
    // if (!req.user?.isAdmin) {
    //   return res.status(403).json({ error: 'Forbidden' });
    // }

    const result = await manualViewSync();
    res.json(result);
  } catch (error) {
    console.error('Error in manual sync:', error);

    let message = 'Unknown error';
    if (error instanceof Error) {
      message = error.message;
    }

    res.status(500).json({
      error: 'Failed to sync view counts',
      message,
    });
  }
});

// Get view statistics for a post
router.get('/stats/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const stats = await getViewStats(postId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting view stats:', error);

    let message = 'Unknown error';

    if (error instanceof Error) {
      message = error.message;
    }

    res.status(500).json({
      error: 'Failed to get view stats',
      message,
    });
  }
});

export default router;
