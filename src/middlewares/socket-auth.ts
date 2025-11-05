import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import crypto from 'crypto';

interface SocketData {
  userId: string | null;
  email?: string;
  isGuest: boolean;
}

export interface AuthenticatedSocket extends Socket {
  data: SocketData;
}

interface CustomTokenPayload {
  userId: string;
  type: string;
  iat: number;
}

export function verifyCustomToken(token: string, secret: string): CustomTokenPayload {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token format');
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid token structure');
  }

  const [payloadB64, signatureB64] = parts;

  if (!payloadB64 || !signatureB64) {
    throw new Error('Missing token components');
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(Buffer.from(payloadB64, 'base64url'))
    .digest('base64url');

  if (signatureB64 !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  try {
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadStr) as CustomTokenPayload;

    if (!payload.userId) {
      throw new Error('Missing userId in token');
    }

    const tokenAge = Date.now() - payload.iat;
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (tokenAge > maxAge) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (err: any) {
    throw new Error(`Failed to decode payload: ${err.message}`);
  }
}

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  console.log('🔍 Middleware running for socket:', socket.id);

  socket.data = socket.data || {};

  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(' ')[1] ||
      (socket.handshake.query.token as string);

    if (!token || token === 'null') {
      socket.data.userId = null;
      socket.data.isGuest = true;
      socket.handshake.auth.userId = null;
      socket.handshake.auth.isGuest = true;
      console.log(`👤 Guest user connected: ${socket.id}`);
      return next();
    }

    try {
      const decoded = verifyCustomToken(token, process.env.NEXTAUTH_SECRET!);
      const userId = decoded.userId;

      socket.data.userId = userId;
      socket.data.isGuest = false;
      socket.handshake.auth.userId = userId;
      socket.handshake.auth.isGuest = false;
      socket.handshake.auth.tokenType = decoded.type;

      console.log(`✅ User authenticated: ${userId} (type: ${decoded.type})`);
      return next();
    } catch (err: any) {
      console.warn(`⚠️ Token verification failed: ${err.message}`);

      socket.data.userId = null;
      socket.data.isGuest = true;
      socket.handshake.auth.userId = null;
      socket.handshake.auth.isGuest = true;
      return next();
    }
  } catch (error) {
    console.error('❌ Auth error:', error);
    socket.data.userId = null;
    socket.data.isGuest = true;
    socket.handshake.auth.userId = null;
    socket.handshake.auth.isGuest = true;
    next();
  }
};

// ✅ FIX: Use function (not arrow function) to preserve `this` context
export const requireAuth = (handler: (socket: AuthenticatedSocket, ...args: any[]) => void | Promise<void>) => {
  return function (this: AuthenticatedSocket, ...args: any[]) {
    const socket = this; // `this` is the socket object

    console.log('🔍 RequireAuth check - socket.id:', socket.id);
    console.log('🔍 RequireAuth check - socket.data:', socket.data);
    console.log('🔍 RequireAuth check - handshake.auth:', socket.handshake?.auth);

    // Fallback to handshake.auth if socket.data is undefined
    const userId = socket.data?.userId || socket.handshake?.auth?.userId;
    const isGuest = socket.data?.isGuest ?? socket.handshake?.auth?.isGuest ?? true;

    if (isGuest || !userId) {
      console.log(`⛔ Unauthenticated request from ${socket.id}`);
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        return callback({ error: 'Authentication required' });
      }
      return;
    }

    // Ensure socket.data exists
    if (!socket.data) {
      socket.data = {
        userId,
        isGuest,
      };
    }

    console.log(`✅ Authenticated request from ${socket.id} (userId: ${userId})`);

    // Call handler with socket as first parameter
    return handler(socket, ...args);
  };
};
