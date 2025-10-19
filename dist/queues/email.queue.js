"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = exports.EmailPriority = void 0;
exports.addEmailJob = addEmailJob;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
// Priority levels
var EmailPriority;
(function (EmailPriority) {
    EmailPriority[EmailPriority["CRITICAL"] = 1] = "CRITICAL";
    EmailPriority[EmailPriority["HIGH"] = 5] = "HIGH";
    EmailPriority[EmailPriority["NORMAL"] = 10] = "NORMAL";
    EmailPriority[EmailPriority["LOW"] = 15] = "LOW";
})(EmailPriority || (exports.EmailPriority = EmailPriority = {}));
exports.emailQueue = new bullmq_1.Queue('email', {
    connection: redis_1.redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600,
        },
    },
});
async function addEmailJob(data, priority = EmailPriority.NORMAL) {
    return exports.emailQueue.add('send-email', data, {
        priority,
        ...(priority === EmailPriority.CRITICAL && { delay: 0 }),
    });
}
//# sourceMappingURL=email.queue.js.map