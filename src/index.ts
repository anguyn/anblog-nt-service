// src/index.ts
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { authenticateRequest } from '#middlewares/auth';
import emailRoutes from '#routes/email.routes';
import notificationRoutes from '#routes/notification.routes';
import monitoringRoutes from '#routes/monitoring.routes';
import healthRoutes from '#routes/health.routes';
import socketRoutes from '#routes/socket.routes';
import { serverAdapter } from '#monitoring/bull-board';
import { startCronJobs } from './cron';
import { initializeSocket } from '#lib/socket';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(express.json());

// Public routes
app.use('/health', healthRoutes);

// Bull Board UI (Protected)
app.use('/admin/queues', authenticateRequest, serverAdapter.getRouter());

// Protected routes
app.use('/api/email', authenticateRequest, emailRoutes);
app.use('/api/notification', authenticateRequest, notificationRoutes);
app.use('/api/monitoring', authenticateRequest, monitoringRoutes);
app.use('/api/socket', authenticateRequest, socketRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.port;

httpServer.listen(PORT, () => {
  console.log(`✅ Notification service running on port ${PORT}`);
  console.log(`🔌 Socket.IO server ready`);
  console.log(`📊 Bull Board UI: http://localhost:${PORT}/admin/queues`);
  console.log(`Environment: ${config.nodeEnv}`);

  startCronJobs();
});
