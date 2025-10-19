import { Redis } from 'ioredis';
import { config } from '../config';
export const redis = config.redis.url
    ? new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
        ...(config.redis.url.startsWith('rediss://') && { tls: {} }), // Chỉ thêm khi cần
    })
    : new Redis({
        host: config.redis.host,
        port: config.redis.port,
        ...(config.redis.password && { password: config.redis.password }),
        maxRetriesPerRequest: null,
        ...(config.redis.url?.startsWith('rediss://') && { tls: {} }), // Chỉ thêm khi cần
    });
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('✅ Redis connected'));
//# sourceMappingURL=redis.js.map