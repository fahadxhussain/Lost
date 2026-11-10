const prisma = require('../../config/prisma');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../shared/errors/AppError');

class MessagingService {
  async getOrCreateConversation({ userId, otherUserId, matchId }) {
    if (!otherUserId) {
      throw new BadRequestError('Recipient otherUserId is required');
    }

    if (userId === otherUserId) {
      throw new BadRequestError('Cannot start a conversation with yourself');
    }

    // Verify other user exists and is active
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true, rollNumber: true, status: true },
    });

    if (!otherUser) {
      throw new NotFoundError('Recipient student not found');
    }

    // If matchId is specified, check if conversation already exists for this match
    if (matchId) {
      const matchConv = await prisma.conversation.findUnique({
        where: { matchId },
        include: {
          participantOne: { select: { id: true, name: true, rollNumber: true } },
          participantTwo: { select: { id: true, name: true, rollNumber: true } },
          match: true,
        },
      });

      if (matchConv) {
        return matchConv;
      }
    }

    // Check for an existing conversation between these two students
    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participantOneId: userId, participantTwoId: otherUserId },
          { participantOneId: otherUserId, participantTwoId: userId },
        ],
      },
      include: {
        participantOne: { select: { id: true, name: true, rollNumber: true } },
        participantTwo: { select: { id: true, name: true, rollNumber: true } },
        match: true,
      },
    });

    if (existing) {
      return existing;
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        participantOneId: userId,
        participantTwoId: otherUserId,
        matchId: matchId || null,
      },
      include: {
        participantOne: { select: { id: true, name: true, rollNumber: true } },
        participantTwo: { select: { id: true, name: true, rollNumber: true } },
        match: true,
      },
    });

    return conversation;
  }

  async getConversations(userId) {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participantOneId: userId }, { participantTwoId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participantOne: { select: { id: true, name: true, rollNumber: true } },
        participantTwo: { select: { id: true, name: true, rollNumber: true } },
        match: {
          select: {
            id: true,
            score: true,
            lostReport: { select: { id: true, title: true } },
            foundReport: { select: { id: true, title: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, senderId: true, content: true, isRead: true, createdAt: true },
        },
      },
    });

    return conversations.map((conv) => {
      const otherParticipant = conv.participantOneId === userId ? conv.participantTwo : conv.participantOne;
      const latestMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        matchId: conv.matchId,
        otherParticipant,
        match: conv.match,
        latestMessage,
        updatedAt: conv.updatedAt,
      };
    });
  }

  async getMessages(conversationId, userId, { page = 1, limit = 50 } = {}) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ForbiddenError('You are not authorized to view messages in this conversation');
    }

    // Mark unread messages sent by the other student as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        isRead: true,
        createdAt: true,
      },
    });

    return messages;
  }

  async sendMessage(conversationId, senderId, content) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestError('Message content cannot be empty');
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (conversation.participantOneId !== senderId && conversation.participantTwoId !== senderId) {
      throw new ForbiddenError('You cannot send messages in a conversation you are not part of');
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId,
          content: content.trim(),
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    return message;
  }
}

module.exports = new MessagingService();
