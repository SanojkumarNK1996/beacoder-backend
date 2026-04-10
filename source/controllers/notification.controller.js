const Notification = require('../models/Notification.model');

const createNotifications = async (req, res) => {
  try {
    const {
      users,
      message,
      module,
      subModule,
      iconType,
      metaData,
      redirectTo
    } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'message is required' });
    }

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'users must be a non-empty array' });
    }

    const payload = users.map(user => ({
      userId: user.userId,
      message,
      module,
      subModule,
      iconType,
      metaData,
      redirectTo,
    }));

    const createdNotifications = await Notification.bulkCreate(payload, { returning: true });

    return res.status(201).json({
      success: true,
      message: 'Notifications created successfully',
      notifications: createdNotifications,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const pageNo = parseInt(req.query.pageNo, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    if (pageNo < 1 || pageSize < 1) {
      return res.status(400).json({ message: 'pageNo and pageSize must be positive integers' });
    }

    const offset = (pageNo - 1) * pageSize;

    const { count, rows } = await Notification.findAndCountAll({
      where: { userId, deletedAt: null },
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    return res.json({
      success: true,
      totalItems: count,
      totalPages: Math.ceil(count / pageSize),
      pageNo,
      pageSize,
      notifications: rows
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadCount = await Notification.count({
      where: { userId, isRead: false, deletedAt: null }
    });

    return res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body || {};

    if (!notificationIds) {
      return res.status(400).json({ message: 'notificationIds should be provided' });
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'notificationIds must be a non-empty array' });
    }

    const [updatedRows] = await Notification.update(
      { isRead: true },
      {
        where: {
          userId,
          id: notificationIds,
          deletedAt: null,
        }
      }
    );

    return res.json({
      success: true,
      updated: updatedRows,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createNotifications,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationsAsRead
};
