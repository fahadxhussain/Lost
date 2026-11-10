const prisma = require('../../config/prisma');
const { NotFoundError, ForbiddenError } = require('../../shared/errors/AppError');

class NotificationsService {
  async getNotifications(userId, { page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: take,
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async markAsRead(id, userId) {
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError('Cannot update another student notification');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return updated;
  }

  async markAllAsRead(userId) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  async getUnreadCount(userId) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }
}

module.exports = new NotificationsService();
