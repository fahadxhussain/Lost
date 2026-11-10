const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');

// Public campus lost & found analytics and recovery overview
router.get('/', analyticsController.getOverviewStats);

module.exports = router;
