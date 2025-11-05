import { prisma } from '#libs/prisma';
import { SOCKET_EVENTS } from '#sockets/events';
import { io } from '#libs/socket';

export enum NotificationType {
  NEW_POST = 'NEW_POST',
  NEW_COMMENT = 'NEW_COMMENT',
  COMMENT_REPLY = 'COMMENT_REPLY',
  COMMENT_LIKE = 'COMMENT_LIKE',
  COMMENT_MENTION = 'COMMENT_MENTION',
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  POST_LIKED = 'POST_LIKED',
  MENTION = 'MENTION',
  SYSTEM = 'SYSTEM',
  POST_PUBLISHED = 'POST_PUBLISHED',
}

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  entityType: string | null;
  entityId: string | null;
  actorId: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, content, entityType, entityId, actorId } = params;

  try {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content: content ? content : null,
        entityType,
        entityId,
        actorId,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    // Send real-time notification via socket
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      entityType: notification.entityType,
      entityId: notification.entityId,
      actor: notification.actor,
      isRead: false,
      createdAt: notification.createdAt.toISOString(),
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

export async function getUnreadNotificationCount(userId: string) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    cursor?: string;
    unreadOnly?: boolean;
  } = {}
) {
  const { limit = 20, cursor, unreadOnly = false } = options;

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, -1) : notifications;

    return {
      notifications: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        entityType: n.entityType,
        entityId: n.entityId,
        actor: n.actor,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
      hasMore,
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
}
