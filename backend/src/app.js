const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const { NotFoundError } = require('./shared/errors/AppError');
const config = require('./config');

// Module Routes
const categoriesRoutes = require('./modules/categories/categories.routes');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', config.storage.uploadDir)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API v1 Routes
app.use('/api/v1/categories', categoriesRoutes);

// Catch 404 for unhandled routes
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Cannot find ${req.method} ${req.originalUrl} on this server`));
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
