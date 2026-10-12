const router = require('express').Router();
const adminController = require('../controllers/admin.controller.js');
const { authorize, requireAuth } = require("../middleware/authorize")

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List or search users by name or ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive name search or exact numeric user ID
 *     responses:
 *       200:
 *         description: Safe user records
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/users', requireAuth, authorize("admin"), adminController.getUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   put:
 *     summary: Update an allowlisted user profile field
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 nullable: true
 *               address:
 *                 type: string
 *                 nullable: true
 *               officeCollege:
 *                 type: string
 *                 nullable: true
 *               mentorProfile:
 *                 type: object
 *                 properties:
 *                   professionalTitle:
 *                     type: string
 *                     nullable: true
 *                   state:
 *                     type: string
 *                     nullable: true
 *                   district:
 *                     type: string
 *                     nullable: true
 *                   currentCompany:
 *                     type: string
 *                     nullable: true
 *                   previousCompanies:
 *                     type: string
 *                     nullable: true
 *                   totalExperience:
 *                     type: number
 *                     nullable: true
 *                   linkedinUrl:
 *                     type: string
 *                     nullable: true
 *                   imageUrl:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *                   profileStatus:
 *                     type: string
 *                     enum: [Active, Inactive]
 *                   visibility:
 *                     type: string
 *                     enum: [yes, no]
 *                   motherTongue:
 *                     type: string
 *                     nullable: true
 *                   languagesKnown:
 *                     type: string
 *                     nullable: true
 *               tag:
 *                 type: string
 *                 enum: [CUSTOMER, COMPANY]
 *               role:
 *                 type: string
 *                 enum: [student, instructor, partner, admin]
 *               isActive:
 *                 type: boolean
 *               showMentor:
 *                 type: boolean
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, premium, failed, refunded, expired]
 *               accessStartsAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               accessExpiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated safe user record
 *       400:
 *         description: Invalid request
 *       404:
 *         description: User not found
 *       409:
 *         description: Email or phone already in use
 */
router.put('/users/:id', requireAuth, authorize("admin"), adminController.updateUser);

/**
 * @swagger
 * /admin/create:
 *   post:
 *     summary: Create a new admin user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/create', requireAuth, authorize("admin"), adminController.createAdmin);

/**
 * @swagger
 * /admin/confirm-payment:
 *   post:
 *     summary: Confirm payment for users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emails
 *             properties:
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/confirm-payment', requireAuth, authorize("admin"), adminController.conformPayment);

module.exports = router;