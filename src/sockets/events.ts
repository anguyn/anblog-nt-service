// src/sockets/events.ts
export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  POST_JOIN: 'join:post',
  POST_LEAVE: 'leave:post',

  // Comments
  COMMENT_NEW: 'comment:new',
  COMMENT_REPLY: 'comment:reply',
  COMMENT_UPDATE: 'comment:update',
  COMMENT_DELETE: 'comment:delete',
  COMMENT_LIKE: 'comment:like',
  COMMENT_UNLIKE: 'comment:unlike',

  // Real-time updates
  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',
  COMMENT_LIKED: 'comment:liked',
  COMMENT_UNLIKED: 'comment:unliked',

  // Post views
  POST_VIEW_START: 'post:view:start',
  POST_VIEW_UPDATE: 'post:view:update',
  POST_VIEW_QUALIFIED: 'post:view:qualified',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_READ_ALL: 'notification:read-all',

  // Typing indicators
  COMMENT_TYPING: 'comment:typing',
  COMMENT_STOP_TYPING: 'comment:stop_typing',

  // System
  SYSTEM_MESSAGE: 'system:message',
  ERROR: 'error',

  // Email
  EMAIL_SENT: 'email:sent',
  EMAIL_FAILED: 'email:failed',
} as const;

// Types
export interface CommentPayload {
  postId: string;
  content: string;
  parentId?: string;
  mentions?: MentionData[];
  stickerId?: string;
}

export interface MentionData {
  userId: string;
  username: string;
  position: number;
}

export interface CommentLikePayload {
  commentId: string;
  postId: string;
}

export interface ViewUpdatePayload {
  postId: string;
  scrollDepth: number;
  timeSpent: number;
}

export interface CommentTypingPayload {
  postId: string;
  parentId?: string;
}

export interface CommentResponse {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  author: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  mentions: Array<{
    id: string;
    username: string;
    position: number;
  }>;
  sticker?: {
    id: string;
    imageUrl: string;
    name: string;
  };
  parentId?: string;
  replyTo?: {
    id: string;
    username: string;
  };
}
