const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');

router.post('/', reportsController.createReport);
router.get('/', reportsController.getReports);
router.get('/:id/matches', reportsController.getMatches);

module.exports = router;
