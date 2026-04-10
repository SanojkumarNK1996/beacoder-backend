const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { requireAuth, authorize } = require('../middleware/authorize');

// Admin only: create one or more notifications for users
/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create notifications for users (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - users
 *               - message
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *               message:
 *                 type: string
 *               module:
 *                 type: string
 *               subModule:
 *                 type: string
 *               iconType:
 *                 type: string
 *               metaData:
 *                 type: object
 *               redirectTo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notifications created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/', requireAuth, authorize('admin'), notificationController.createNotifications);

// Authenticated user: get notifications with paging
/**
 * @swagger
 * /notifications/me:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageNo
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalItems:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 pageNo:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/me', requireAuth, notificationController.getUserNotifications);

// Authenticated user: get unread count 
/**
 * @swagger
 * /notifications/me/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 unreadCount:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/me/unread-count', requireAuth, notificationController.getUnreadNotificationCount);

// Authenticated user: mark selected notifications as read
/**
 * @swagger
 * /notifications/me/mark-read:
 *   patch:
 *     summary: Mark notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 updated:
 *                   type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.patch('/me/mark-read', requireAuth, notificationController.markNotificationsAsRead);

module.exports = router;
