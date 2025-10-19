"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = startCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const cleanup_jobs_1 = require("./cleanup-jobs");
function startCronJobs() {
    // Cleanup old jobs every day at 2 AM
    node_cron_1.default.schedule('0 2 * * *', async () => {
        console.log('Running job cleanup...');
        await (0, cleanup_jobs_1.cleanupOldJobs)();
    });
    // TODO: Add more cron jobs later
    // - Daily digest emails
    // - Scheduled posts
    // - etc.
    console.log('✅ Cron jobs started');
}
//# sourceMappingURL=index.js.map