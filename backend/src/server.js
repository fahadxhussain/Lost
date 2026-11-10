const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./shared/logger');

const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info(`COMSATS Lost & Found API server running on port ${config.port} in ${config.nodeEnv} mode`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
  });
});
