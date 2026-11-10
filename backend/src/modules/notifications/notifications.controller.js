const notificationsService = require('./notifications.service');

async function getNotifications(req, res, next) {
  try {
    const result = await notificationsService.getNotifications(req.user.id, req.query);
    return res.status(200).json({
      status: 'success',
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const updated = await notificationsService.markAsRead(req.params.id, req.user.id);
    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await notificationsService.markAllAsRead(req.user.id);
    return res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const result = await notificationsService.getUnreadCount(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
