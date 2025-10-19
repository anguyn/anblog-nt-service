"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = require("ioredis");
const config_1 = require("../config");
exports.redis = config_1.config.redis.url
    ? new ioredis_1.Redis(config_1.config.redis.url, {
        maxRetriesPerRequest: null,
        ...(config_1.config.redis.url.startsWith('rediss://') && { tls: {} }), // Chỉ thêm khi cần
    })
    : new ioredis_1.Redis({
        host: config_1.config.redis.host,
        port: config_1.config.redis.port,
        ...(config_1.config.redis.password && { password: config_1.config.redis.password }),
        maxRetriesPerRequest: null,
        ...(config_1.config.redis.url?.startsWith('rediss://') && { tls: {} }), // Chỉ thêm khi cần
    });
exports.redis.on('error', (err) => console.error('Redis error:', err));
exports.redis.on('connect', () => console.log('✅ Redis connected'));
//# sourceMappingURL=redis.js.map