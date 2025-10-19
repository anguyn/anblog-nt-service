"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const auth_1 = require("./middlewares/auth");
const email_routes_1 = __importDefault(require("./routes/email.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const monitoring_routes_1 = __importDefault(require("./routes/monitoring.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const socket_routes_1 = __importDefault(require("./routes/socket.routes"));
const bull_board_1 = require("./monitoring/bull-board");
const cron_1 = require("./cron");
const socket_1 = require("./lib/socket");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.IO
(0, socket_1.initializeSocket)(httpServer);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Public routes
app.use('/health', health_routes_1.default);
// Bull Board UI (Protected)
app.use('/admin/queues', auth_1.authenticateRequest, bull_board_1.serverAdapter.getRouter());
// Protected routes
app.use('/api/email', auth_1.authenticateRequest, email_routes_1.default);
app.use('/api/notification', auth_1.authenticateRequest, notification_routes_1.default);
app.use('/api/monitoring', auth_1.authenticateRequest, monitoring_routes_1.default);
app.use('/api/socket', auth_1.authenticateRequest, socket_routes_1.default);
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
const PORT = config_1.config.port;
httpServer.listen(PORT, () => {
    console.log(`✅ Notification service running on port ${PORT}`);
    console.log(`🔌 Socket.IO server ready`);
    console.log(`📊 Bull Board UI: http://localhost:${PORT}/admin/queues`);
    console.log(`Environment: ${config_1.config.nodeEnv}`);
    (0, cron_1.startCronJobs)();
});
//# sourceMappingURL=index.js.map