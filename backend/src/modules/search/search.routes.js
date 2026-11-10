const express = require('express');
const router = express.Router();
const searchController = require('./search.controller');

// Search reports with keyword, typo tolerance, and filters (pure PostgreSQL)
router.get('/', searchController.searchReports);

module.exports = router;
