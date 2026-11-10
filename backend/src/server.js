const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const config = require('./config');
const logger = require('./shared/logger');
const messagingService = require('./modules/messaging/messaging.service');
const prisma = require('./config/prisma');

const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Provide socket instance to Express app for REST event broadcasting
app.set('io', io);

// Socket Authentication Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const current = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!current || current.status !== 'ACTIVE' || (decoded.tokenVersion || 0) !== current.tokenVersion) return next(new Error('Authentication error: Please sign in again'));
    socket.user = decoded;
    socket.use(async (_packet, proceed) => {
      try {
        jwt.verify(token, config.jwt.secret);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || user.status !== 'ACTIVE' || (decoded.tokenVersion || 0) !== user.tokenVersion) {
          socket.emit('session_expired');
          socket.disconnect(true);
          return proceed(new Error('Your session expired. Please sign in again.'));
        }
        proceed();
      } catch { socket.disconnect(true); proceed(new Error('Authentication error')); }
    });
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user_${socket.user.id}`);
  logger.info(`[Socket.IO] Student connected: ${socket.user.email} (socket id: ${socket.id})`);

  // Join a conversation room
  socket.on('join_conversation', ({ conversationId }) => {
    socket.join(`conv_${conversationId}`);
    logger.debug(`[Socket.IO] Socket ${socket.id} joined conversation conv_${conversationId}`);
  });

  // Leave a conversation room
  socket.on('leave_conversation', ({ conversationId }) => {
    socket.leave(`conv_${conversationId}`);
    logger.debug(`[Socket.IO] Socket ${socket.id} left conversation conv_${conversationId}`);
  });

  // Real-time message exchange
  socket.on('send_message', async ({ conversationId, content }, callback) => {
    try {
      const message = await messagingService.sendMessage(conversationId, socket.user.id, content);
      
      // Broadcast to all clients in conversation room (including sender confirmation)
      io.to(`conv_${conversationId}`).emit('new_message', message);

      if (callback) callback({ status: 'ok', data: message });
    } catch (err) {
      if (callback) callback({ status: 'error', message: err.message });
    }
  });

  // Typing indicator
  socket.on('typing', ({ conversationId, isTyping }) => {
    socket.to(`conv_${conversationId}`).emit('user_typing', {
      userId: socket.user.id,
      isTyping,
    });
  });

  socket.on('disconnect', () => {
    logger.debug(`[Socket.IO] Student disconnected: ${socket.user.email}`);
  });
});

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

module.exports = { server, io };
