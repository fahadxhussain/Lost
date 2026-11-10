const express = require('express');
const router = express.Router();
const notificationsController = require('./notifications.controller');
const { authenticate, requireActiveStudent } = require('../../middleware/auth');

router.use(authenticate, requireActiveStudent);

router.get('/', notificationsController.getNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/:id/read', notificationsController.markAsRead);

module.exports = router;
