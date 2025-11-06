import { AuthenticatedSocket, requireAuth } from '#middlewares/socket-auth';
import { SOCKET_EVENTS, CommentPayload, CommentLikePayload, CommentTypingPayload } from '../events';
import { prisma } from '#libs/prisma';
import { NotificationType } from '#services/notification.service';
import { createNotification } from '#services/notification.service';
import { throttle } from '#libs/utils/throttle';
import { io } from '#libs/socket';

function isInPostRoom(socket: AuthenticatedSocket, postId: string): boolean {
  return socket.rooms.has(`post:${postId}`);
}
export function setupCommentHandlers(socket: AuthenticatedSocket) {
  const userId = socket.data.userId;

  // Join/Leave room handlers
  socket.on(SOCKET_EVENTS.POST_JOIN, (postId: string) => {
    socket.join(`post:${postId}`);
    console.log(`📍 User ${userId} joined post:${postId}`);
  });

  socket.on(SOCKET_EVENTS.POST_LEAVE, (postId: string) => {
    socket.leave(`post:${postId}`);
    console.log(`📍 User ${userId} left post:${postId}`);
  });

  // Create comment - REQUIRES AUTH
  socket.on(
    SOCKET_EVENTS.COMMENT_NEW,
    requireAuth(async (socket: AuthenticatedSocket, payload: CommentPayload, callback) => {
      const userId = socket.data.userId!;
      const { postId, content, parentId, mentions, stickerId } = payload;

      if (!isInPostRoom(socket, postId)) {
        return callback({ error: 'Must join post room first' });
      }

      try {
        // Validate content
        if (!content?.trim() && !stickerId) {
          return callback({ error: 'Content or sticker required' });
        }

        // Validate mentions - check if users exist
        let validatedMentions: any[] = [];
        if (mentions && mentions.length > 0) {
          const mentionedUsers = await prisma.user.findMany({
            where: {
              id: { in: mentions.map((m) => m.userId) },
              status: 'ACTIVE',
            },
            select: { id: true, username: true },
          });

          validatedMentions = mentions
            .filter((m) => mentionedUsers.some((u) => u.id === m.userId))
            .map((m) => ({
              userId: m.userId,
              username: mentionedUsers.find((u) => u.id === m.userId)!.username,
              position: m.position,
            }));
        }

        // Create comment with transaction
        const comment = await prisma.$transaction(
          async (tx) => {
            // Create comment
            const newComment = await tx.comment.create({
              data: {
                content: content?.trim() || '',
                postId,
                authorId: userId,
                parentId: parentId || null,
                mentions: {
                  create: validatedMentions.map((m) => ({
                    userId: m.userId,
                    username: m.username,
                    position: m.position,
                  })),
                },
                ...(stickerId && {
                  stickers: {
                    create: { stickerId },
                  },
                }),
              },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                  },
                },
                mentions: {
                  select: {
                    id: true,
                    userId: true,
                    username: true,
                    position: true,
                  },
                },
                stickers: {
                  include: {
                    sticker: true,
                  },
                },
                parent: {
                  select: {
                    id: true,
                    authorId: true,
                    author: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            });

            // Update reply count if this is a reply
            if (parentId) {
              await tx.comment.update({
                where: { id: parentId },
                data: { replyCount: { increment: 1 } },
              });
            }

            // Update post comment count
            await tx.post.update({
              where: { id: postId },
              data: { commentCount: { increment: 1 } },
            });

            return newComment;
          },
          {
            maxWait: 10000,
            timeout: 25000,
          }
        );

        // Format response
        const response = formatCommentResponse(comment, userId);

        // Send success callback
        callback({ success: true, comment: response });

        // Broadcast to post room
        socket.to(`post:${postId}`).emit(SOCKET_EVENTS.COMMENT_CREATED, response);

        // Handle notifications asynchronously
        handleCommentNotifications(comment, validatedMentions);
      } catch (error) {
        console.error('Error creating comment:', error);
        callback({ error: 'Failed to create comment' });
      }
    })
  );

  // Like comment with throttle - REQUIRES AUTH
  const likeComment = throttle(
    requireAuth(async (socket: AuthenticatedSocket, payload: CommentLikePayload, callback) => {
      const userId = socket.data.userId!;
      const { commentId, postId } = payload;

      if (!isInPostRoom(socket, postId)) {
        return callback({ error: 'Must join post room first' });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Check if already liked
          const existingLike = await tx.commentLike.findUnique({
            where: {
              commentId_userId: { commentId, userId },
            },
          });

          if (existingLike) {
            return callback({ error: 'Already liked' });
          }

          // Create like
          await tx.commentLike.create({
            data: { commentId, userId },
          });

          // Update like count
          const comment = await tx.comment.update({
            where: { id: commentId },
            data: { likeCount: { increment: 1 } },
            include: {
              author: { select: { id: true } },
            },
          });

          return comment;
        });

        callback({ success: true, likeCount: result.likeCount });

        // Broadcast
        io.to(`post:${postId}`).emit(SOCKET_EVENTS.COMMENT_LIKED, {
          commentId,
          likeCount: result.likeCount,
          userId,
        });

        // Notify comment author
        if (result.authorId !== userId) {
          await createNotification({
            userId: result.authorId,
            type: NotificationType.COMMENT_LIKE,
            title: 'Someone liked your comment',
            entityType: 'COMMENT',
            entityId: commentId,
            actorId: userId,
          });
        }
      } catch (error) {
        console.error('Error liking comment:', error);
        callback({ error: 'Failed to like comment' });
      }
    }),
    1000
  ); // Throttle 1s

  socket.on(SOCKET_EVENTS.COMMENT_LIKE, likeComment);

  // Unlike comment - REQUIRES AUTH
  socket.on(
    SOCKET_EVENTS.COMMENT_UNLIKE,
    requireAuth(async (socket: AuthenticatedSocket, payload: CommentLikePayload, callback) => {
      const userId = socket.data.userId!;
      const { commentId, postId } = payload;

      if (!isInPostRoom(socket, postId)) {
        return callback({ error: 'Must join post room first' });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Delete like
          const deleted = await tx.commentLike.deleteMany({
            where: { commentId, userId },
          });

          if (deleted.count === 0) {
            return callback({ error: 'Not liked' });
          }

          // Update like count
          const comment = await tx.comment.update({
            where: { id: commentId },
            data: { likeCount: { decrement: 1 } },
          });

          return comment;
        });

        callback({ success: true, likeCount: result.likeCount });

        // Broadcast
        io.to(`post:${postId}`).emit(SOCKET_EVENTS.COMMENT_UNLIKED, {
          commentId,
          likeCount: result.likeCount,
          userId,
        });
      } catch (error) {
        console.error('Error unliking comment:', error);
        callback({ error: 'Failed to unlike comment' });
      }
    })
  );

  // Delete comment - REQUIRES AUTH
  socket.on(
    SOCKET_EVENTS.COMMENT_DELETE,
    requireAuth(async (socket: AuthenticatedSocket, payload: { commentId: string; postId: string }, callback) => {
      const userId = socket.data.userId!;
      const { commentId, postId } = payload;

      if (!isInPostRoom(socket, postId)) {
        return callback({ error: 'Must join post room first' });
      }

      try {
        // Check ownership
        const comment = await prisma.comment.findUnique({
          where: { id: commentId },
          select: { authorId: true, parentId: true },
        });

        if (!comment || comment.authorId !== userId) {
          return callback({ error: 'Unauthorized' });
        }

        await prisma.$transaction(async (tx) => {
          // Delete comment (cascade will handle likes, mentions, stickers)
          await tx.comment.delete({ where: { id: commentId } });

          // Update parent reply count
          if (comment.parentId) {
            await tx.comment.update({
              where: { id: comment.parentId },
              data: { replyCount: { decrement: 1 } },
            });
          }

          // Update post comment count
          await tx.post.update({
            where: { id: postId },
            data: { commentCount: { decrement: 1 } },
          });
        });

        callback({ success: true });

        // Broadcast
        io.to(`post:${postId}`).emit(SOCKET_EVENTS.COMMENT_DELETED, { commentId });
      } catch (error) {
        console.error('Error deleting comment:', error);
        callback({ error: 'Failed to delete comment' });
      }
    })
  );

  // Typing indicators with throttle - REQUIRES AUTH
  socket.on(
    SOCKET_EVENTS.COMMENT_TYPING,
    requireAuth(async (socket: AuthenticatedSocket, payload: CommentTypingPayload) => {
      console.log('Test: ', socket.data);
      const userId = socket.data.userId!;
      socket.to(`post:${payload.postId}`).emit(SOCKET_EVENTS.COMMENT_TYPING, {
        userId,
        postId: payload.postId,
        parentId: payload.parentId,
      });
    })
  );

  socket.on(
    SOCKET_EVENTS.COMMENT_STOP_TYPING,
    requireAuth(async (socket: AuthenticatedSocket, payload: CommentTypingPayload, callback) => {
      const userId = socket.data.userId!;

      if (!isInPostRoom(socket, payload.postId)) {
        return callback({ error: 'Must join post room first' });
      }

      socket.to(`post:${payload.postId}`).emit(SOCKET_EVENTS.COMMENT_STOP_TYPING, {
        userId,
        postId: payload.postId,
        parentId: payload.parentId,
      });
    })
  );
}

// Helper functions
function formatCommentResponse(comment: any, currentUserId?: string) {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    isEdited: comment.isEdited,
    likeCount: comment.likeCount,
    replyCount: comment.replyCount,
    isLiked: false, // Will be populated by API
    author: comment.author,
    mentions: comment.mentions || [],
    sticker: comment.stickers?.[0]?.sticker,
    parentId: comment.parentId,
    replyTo: comment.parent
      ? {
          id: comment.parent.id,
          username: comment.parent.author.username,
        }
      : undefined,
  };
}

async function handleCommentNotifications(comment: any, mentions: any[]) {
  const notifications: any[] = [];

  // Notify mentioned users
  for (const mention of mentions) {
    if (mention.userId !== comment.authorId) {
      notifications.push({
        userId: mention.userId,
        type: 'COMMENT_MENTION',
        title: 'You were mentioned in a comment',
        entityType: 'COMMENT',
        entityId: comment.id,
        actorId: comment.authorId,
      });
    }
  }

  // Notify parent comment author (reply notification)
  if (comment.parent && comment.parent.authorId !== comment.authorId) {
    notifications.push({
      userId: comment.parent.authorId,
      type: 'COMMENT_REPLY',
      title: 'Someone replied to your comment',
      entityType: 'COMMENT',
      entityId: comment.id,
      actorId: comment.authorId,
    });
  }

  // Create notifications
  for (const notif of notifications) {
    await createNotification(notif);
  }
}
