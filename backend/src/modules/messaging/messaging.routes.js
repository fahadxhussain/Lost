const express = require('express');
const router = express.Router();
const messagingController = require('./messaging.controller');
const { authenticate, requireActiveStudent } = require('../../middleware/auth');

router.use(authenticate, requireActiveStudent);

// Get all conversations for current user
router.get('/', messagingController.getConversations);

// Create or get existing conversation
router.post('/', messagingController.getOrCreateConversation);

// Get messages in a conversation
router.get('/:id/messages', messagingController.getMessages);

// Send message in a conversation
router.post('/:id/messages', messagingController.sendMessage);

module.exports = router;
