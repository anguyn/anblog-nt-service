"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./email.worker");
require("./notification.worker");
const email_worker_1 = require("./email.worker");
const notification_worker_1 = require("./notification.worker");
console.log('🚀 Workers started');
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing workers...');
    await email_worker_1.emailWorker.close();
    await notification_worker_1.notificationWorker.close();
    process.exit(0);
});
//# sourceMappingURL=index.js.map