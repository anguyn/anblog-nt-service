"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
const notification_handler_1 = require("./notification.handler");
function setupSocketHandlers(socket) {
    (0, notification_handler_1.setupNotificationHandlers)(socket);
    // Add more handlers here
    // setupChatHandlers(socket);
    // setupPresenceHandlers(socket);
}
//# sourceMappingURL=index.js.map