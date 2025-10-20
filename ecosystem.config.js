// ecosystem.config.js
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'api',
      script: path.join(__dirname, 'dist', 'index.js'),  // ← Absolute path
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'worker',
      script: path.join(__dirname, 'dist', 'workers', 'index.js'),  // ← Absolute path
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};