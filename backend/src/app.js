const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const { NotFoundError } = require('./shared/errors/AppError');
const config = require('./config');

// Module Routes
const authRoutes = require('./modules/auth/auth.routes');
const categoriesRoutes = require('./modules/categories/categories.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const searchRoutes = require('./modules/search/search.routes');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', config.storage.uploadDir)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'COMSATS Lost & Found API is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Root welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'COMSATS Lost & Found API',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      health: 'GET /health',
      categories: 'GET /api/v1/categories',
      auth: 'POST /api/v1/auth/*',
      reports: 'GET|POST /api/v1/reports/*',
    },
  });
});

// Mount API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/search', searchRoutes);

// Catch 404 for unhandled routes
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Cannot find ${req.method} ${req.originalUrl} on this server`));
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
