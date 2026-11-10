const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { authenticate, requireActiveStudent } = require('../../middleware/auth');
const { upload } = require('../../services/storage/storageService');

// Create report (requires active verified student & optional image file)
router.post(
  '/',
  authenticate,
  requireActiveStudent,
  upload.single('image'),
  reportsController.createReport
);

// List active reports with filtering & pagination (public/feed)
router.get('/', reportsController.getReports);

// Get my reports (requires auth)
router.get('/me', authenticate, requireActiveStudent, reportsController.getMyReports);

// Get report by ID
router.get('/:id', reportsController.getReportById);

// Update my report (requires active student & owner check)
router.patch(
  '/:id',
  authenticate,
  requireActiveStudent,
  upload.single('image'),
  reportsController.updateReport
);

// Update report status (e.g. mark RESOLVED or CLOSED)
router.patch(
  '/:id/status',
  authenticate,
  requireActiveStudent,
  reportsController.updateReportStatus
);

// Get potential matches for a report
router.get('/:id/matches', authenticate, requireActiveStudent, reportsController.getMatches);

module.exports = router;
