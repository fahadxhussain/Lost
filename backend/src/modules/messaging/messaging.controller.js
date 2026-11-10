const messagingService = require('./messaging.service');

async function getOrCreateConversation(req, res, next) {
  try {
    const { otherUserId, matchId } = req.body;
    const conversation = await messagingService.getOrCreateConversation({
      userId: req.user.id,
      otherUserId,
      matchId,
    });

    return res.status(200).json({
      status: 'success',
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
}

async function getConversations(req, res, next) {
  try {
    const conversations = await messagingService.getConversations(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const messages = await messagingService.getMessages(req.params.id, req.user.id, req.query);
    return res.status(200).json({
      status: 'success',
      data: messages,
    });
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { content } = req.body;
    const message = await messagingService.sendMessage(req.params.id, req.user.id, content);

    return res.status(201).json({
      status: 'success',
      data: message,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
};
