const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const { requireAuth } = require('../middleware/authorize');

router.post('/',assignmentController.createAssignment);

// Get assignments 
router.get('/my-assignments',requireAuth,assignmentController.getMyAssignments);

// Submit assignment
router.post('/:assignmentId/submit',requireAuth,assignmentController.submitAssignment);

module.exports = router;