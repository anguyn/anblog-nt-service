// src/sockets/handlers/view.handler.ts
import { AuthenticatedSocket } from '#middlewares/socket-auth';
import { SOCKET_EVENTS, ViewUpdatePayload } from '../events';
import { redis } from '#libs/redis';
import { prisma } from '#libs/prisma';
import { throttle } from '#libs/utils/throttle';

// View quality thresholds
const VIEW_THRESHOLDS = {
  MIN_TIME_SPENT: 15, // seconds
  MIN_SCROLL_DEPTH: 30, // percentage
  QUALIFIED_TIME: 30, // seconds for qualified view
  QUALIFIED_SCROLL: 50, // percentage for qualified view
};

// Redis key patterns
const REDIS_KEYS = {
  viewSession: (viewId: string) => `view:session:${viewId}`,
  viewCount: (postId: string) => `view:count:${postId}`,
  userView: (userId: string, postId: string) => `view:user:${userId}:${postId}`,
  ipView: (ip: string, postId: string) => `view:ip:${ip}:${postId}`,
  guestView: (socketId: string, postId: string) => `view:guest:${socketId}:${postId}`,
  viewMetrics: (viewId: string) => `view:metrics:${viewId}`,
};

// TTL values (in seconds)
const TTL = {
  viewSession: 3600, // 1 hour
  viewDuplicate: 1800, // 30 minutes - prevent duplicate views
  viewMetrics: 86400, // 24 hours - keep metrics for a day
};

interface ViewSession {
  postId: string;
  userId: string | null;
  ipAddress?: string;
  socketId: string;
  startTime: number;
  maxScrollDepth: number;
  timeSpent: number;
  isQualified: boolean;
  isGuest: boolean;
}

export function setupPostViewHandlers(socket: AuthenticatedSocket) {
  const userId = socket.data.userId; // Can be null for guests
  const isGuest = socket.data.isGuest;
  const socketId = socket.id;
  const viewSessions = new Map<string, ViewSession>();

  // Start view tracking
  socket.on(SOCKET_EVENTS.POST_VIEW_START, async (payload: { postId: string }, callback) => {
    try {
      const { postId } = payload;
      const ipAddress = socket.handshake.address;

      // Generate unique viewId
      const viewId = userId ? `user_${userId}_${postId}_${Date.now()}` : `guest_${socketId}_${postId}_${Date.now()}`;

      // Check if view already exists recently (prevent duplicates)
      let existingView = null;

      if (userId) {
        // Authenticated user
        const userViewKey = REDIS_KEYS.userView(userId, postId);
        existingView = await redis.get(userViewKey);
      } else {
        // Guest user - check by socket and IP
        const [guestViewBySocket, guestViewByIp] = await Promise.all([
          redis.get(REDIS_KEYS.guestView(socketId, postId)),
          redis.get(REDIS_KEYS.ipView(ipAddress, postId)),
        ]);
        existingView = guestViewBySocket || guestViewByIp;
      }

      if (existingView) {
        return callback({
          success: true,
          viewId: existingView,
          isDuplicate: true,
        });
      }

      // Create view session in Redis
      const session: ViewSession = {
        postId,
        userId,
        ipAddress,
        socketId,
        startTime: Date.now(),
        maxScrollDepth: 0,
        timeSpent: 0,
        isQualified: false,
        isGuest,
      };

      // Store session data
      const storePromises = [
        // Store session
        redis.setex(REDIS_KEYS.viewSession(viewId), TTL.viewSession, JSON.stringify(session)),
        // Mark IP view to prevent duplicates
        redis.setex(REDIS_KEYS.ipView(ipAddress, postId), TTL.viewDuplicate, viewId),
        // Initialize metrics
        redis.setex(
          REDIS_KEYS.viewMetrics(viewId),
          TTL.viewMetrics,
          JSON.stringify({
            scrollDepth: 0,
            timeSpent: 0,
            updates: 0,
          })
        ),
      ];

      if (userId) {
        // Mark user view to prevent duplicates
        storePromises.push(redis.setex(REDIS_KEYS.userView(userId, postId), TTL.viewDuplicate, viewId));
      } else {
        // Mark guest view by socket
        storePromises.push(redis.setex(REDIS_KEYS.guestView(socketId, postId), TTL.viewDuplicate, viewId));
      }

      await Promise.all(storePromises);

      // Initialize local session
      viewSessions.set(postId, session);

      callback({ success: true, viewId });

      const userType = isGuest ? 'Guest' : 'User';
      console.log(`👁️ ${userType} view tracking started: ${viewId} for post ${postId}`);
    } catch (error) {
      console.error('Error starting view tracking:', error);
      callback({ error: 'Failed to start view tracking' });
    }
  });

  // Update view metrics (throttled)
  const updateViewMetrics = throttle(async (payload: ViewUpdatePayload) => {
    try {
      const { postId, scrollDepth, timeSpent } = payload;
      const session = viewSessions.get(postId);

      if (!session) {
        console.warn('No active view session for post:', postId);
        return;
      }

      // Update session data
      session.maxScrollDepth = Math.max(session.maxScrollDepth, scrollDepth);
      session.timeSpent = timeSpent;

      const viewId = userId
        ? `user_${userId}_${postId}_${session.startTime}`
        : `guest_${socketId}_${postId}_${session.startTime}`;

      // Check if view should be qualified
      const shouldQualify =
        !session.isQualified &&
        ((timeSpent >= VIEW_THRESHOLDS.QUALIFIED_TIME && scrollDepth >= VIEW_THRESHOLDS.QUALIFIED_SCROLL) ||
          timeSpent >= VIEW_THRESHOLDS.QUALIFIED_TIME * 2); // Long dwell time

      if (shouldQualify) {
        session.isQualified = true;

        // Increment post view count in database
        await prisma.post.update({
          where: { id: postId },
          data: { viewCount: { increment: 1 } },
        });

        // Increment Redis counter
        await redis.incr(REDIS_KEYS.viewCount(postId));

        // Notify client
        socket.emit(SOCKET_EVENTS.POST_VIEW_QUALIFIED, {
          postId,
          viewId,
        });

        const userType = isGuest ? 'Guest' : 'User';
        console.log(`✅ ${userType} view qualified: ${viewId} for post ${postId}`);
      }

      // Update metrics in Redis
      await redis.setex(
        REDIS_KEYS.viewMetrics(viewId),
        TTL.viewMetrics,
        JSON.stringify({
          scrollDepth: session.maxScrollDepth,
          timeSpent: session.timeSpent,
          isQualified: session.isQualified,
          isGuest: session.isGuest,
          lastUpdate: Date.now(),
        })
      );

      // Update session in Redis
      await redis.setex(REDIS_KEYS.viewSession(viewId), TTL.viewSession, JSON.stringify(session));
    } catch (error) {
      console.error('Error updating view metrics:', error);
    }
  }, 5000); // Throttle to 5 seconds

  socket.on(SOCKET_EVENTS.POST_VIEW_UPDATE, updateViewMetrics);

  // Cleanup on disconnect
  socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
    // Save final state of all view sessions
    for (const [postId, session] of viewSessions.entries()) {
      try {
        const viewId = userId
          ? `user_${userId}_${postId}_${session.startTime}`
          : `guest_${socketId}_${postId}_${session.startTime}`;

        const finalTimeSpent = Math.floor((Date.now() - session.startTime) / 1000);

        // Update final metrics
        await redis.setex(
          REDIS_KEYS.viewMetrics(viewId),
          TTL.viewMetrics,
          JSON.stringify({
            scrollDepth: session.maxScrollDepth,
            timeSpent: finalTimeSpent,
            isQualified: session.isQualified,
            isGuest: session.isGuest,
            completed: true,
            endTime: Date.now(),
          })
        );

        console.log(`📊 View session ended: ${viewId}`);
      } catch (error) {
        console.error('Error saving view on disconnect:', error);
      }
    }
    viewSessions.clear();
  });
}

// Utility function to get view statistics
export async function getViewStats(postId: string) {
  try {
    const viewCountKey = REDIS_KEYS.viewCount(postId);
    const redisCount = await redis.get(viewCountKey);

    // Get count from database
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { viewCount: true },
    });

    return {
      totalViews: post?.viewCount || 0,
      redisCount: parseInt(redisCount || '0', 10),
    };
  } catch (error) {
    console.error('Error getting view stats:', error);
    return { totalViews: 0, redisCount: 0 };
  }
}

// Sync Redis view counts to database (call this periodically via cron)
export async function syncViewCounts() {
  try {
    const pattern = 'view:count:*';
    const keys = await redis.keys(pattern);

    let totalSynced = 0;

    for (const key of keys) {
      const postId = key.replace('view:count:', '');
      const count = await redis.get(key);

      if (count && parseInt(count, 10) > 0) {
        // Update database
        await prisma.post.update({
          where: { id: postId },
          data: { viewCount: { increment: parseInt(count, 10) } },
        });

        // Reset Redis counter
        await redis.del(key);

        totalSynced += parseInt(count, 10);
        console.log(`✅ Synced ${count} views for post ${postId}`);
      }
    }

    console.log(`🔄 Total views synced: ${totalSynced} across ${keys.length} posts`);
    return true;
  } catch (error) {
    console.error('❌ Error syncing view counts:', error);
    return false;
  }
}
