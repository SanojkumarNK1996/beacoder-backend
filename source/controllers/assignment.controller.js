const Assignments = require('../models/Assignment.model');
const AssignmentSubmissions = require('../models/AssignmentSubmission.model');
const Courses = require('../models/Courses.model');


// create assessments
const createAssignment = async (req, res) => {
  try {

    // const role = req.user.role;
    // if (role !== 'admin' && role !== 'instructor') {
    //   return res.status(403).json({ message: 'Unauthorized' });
    // }

    const {
      title,
      description,
      submissionType,
      allowedUrlType,
      maxMarks,
      dueDate,
      courseId,
      topicId,
      subtopicId,
      displayOrder
    } = req.body;

    if (!description || typeof description !== 'object') {
      return res.status(400).json({
        message: "Description must be a structured JSON object."
      });
    }

    const assignment = await Assignments.create({
      title,
      description,
      submissionType,
      allowedUrlType,
      maxMarks,
      dueDate,
      courseId,
      topicId,
      subtopicId,
      displayOrder: displayOrder || 1
    });

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      assignment
    });

  } catch (error) {
    // Handle Sequelize Unique/Validation errors specifically if needed
    res.status(500).json({ message: error.message });
  }
};

//  get assessments 
const getMyAssignments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const whereClause = { userId };

    if (status) {
      whereClause.status = status;
    }

    const myAssignments = await AssignmentSubmissions.findAll({
      where: whereClause,
      include: [{
        model: Assignments,
        include: [{
          model: Courses,
          attributes: ['courseName'],
          as: 'Course'
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      assignments: myAssignments
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// submit assignment
const submitAssignment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { assignmentId } = req.params;
    const { textAnswer, submissionUrl } = req.body;
    console.log({textAnswer, submissionUrl})

    const existingSubmission = await AssignmentSubmissions.findOne({
      where: { assignmentId, userId }
    });

    if (!existingSubmission) {
      return res.status(403).json({
        message: 'Assignment not unlocked yet. Complete the required subtopic first.'
      });
    }

    if (existingSubmission.status === 'accepted') {
      return res.status(400).json({
        message: 'Assignment already accepted. Resubmission not allowed.'
      });
    }

    const assignment = await Assignments.findByPk(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Validation
    if (assignment.submissionType === 'TEXT' && !textAnswer)
      return res.status(400).json({ message: 'Text answer required' });

    if (assignment.submissionType === 'URL' && !submissionUrl)
      return res.status(400).json({ message: 'URL required' });

    if (assignment.submissionType === 'BOTH' && (!textAnswer || !submissionUrl))
      return res.status(400).json({ message: 'Both text and URL required' });

    if (assignment.allowedUrlType === 'GITHUB' &&
      submissionUrl &&
      !submissionUrl.includes('github.com')) {
      return res.status(400).json({ message: 'Only GitHub URL allowed' });
    }

    if (assignment.allowedUrlType === 'DRIVE' &&
      submissionUrl &&
      !submissionUrl.includes('drive.google.com')) {
      return res.status(400).json({ message: 'Only Google Drive URL allowed' });
    }

    await existingSubmission.update({
      textAnswer,
      submissionUrl,
      status: 'submitted',
      submittedAt: new Date() // Explicitly set the time of submission
    });

    res.json({
      success: true,
      message: 'Assignment submitted successfully'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  createAssignment,
  getMyAssignments,
  submitAssignment
}