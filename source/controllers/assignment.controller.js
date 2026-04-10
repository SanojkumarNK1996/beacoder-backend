const { Op } = require('sequelize');
const Assignments = require('../models/Assignment.model');
const AssignmentSubmissions = require('../models/AssignmentSubmission.model');
const Courses = require('../models/Courses.model');
const Users = require('../models/Users.model');
const UserBadge = require('../models/UserBadge.model');


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

const getMyAssignmentStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const submittedCount = await AssignmentSubmissions.count({
      where: {
        userId,
        status: {
          [Op.in]: ['submitted', 'accepted']
        }
      }
    });

    const pendingCount = await AssignmentSubmissions.count({
      where: {
        userId,
        status: {
          [Op.in]: ['pending', 'rejected']
        }
      }
    });

    const earnedBadgesCount = await UserBadge.count({
      where: { userId }
    });

    return res.json({
      success: true,
      data: {
        submittedCount,
        pendingCount,
        earnedBadges: earnedBadgesCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// admin: get all submitted assignment submissions with pagination
const getSubmittedAssignments = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const courseId = req.query.courseId;
    const status = req.query.status;

    if (pageNo < 1 || pageSize < 1) {
      return res.status(400).json({ message: 'pageNo and pageSize must be positive integers' });
    }

    const offset = (pageNo - 1) * pageSize;

    let whereClause = { status: 'submitted' }; // default to pending
    if (status === 'reviewed') {
      whereClause = { status: { [Op.in]: ['accepted', 'rejected'] } };
    } else if (status === 'pending') {
      whereClause = { status: 'submitted' };
    }

    const baseWhereSubmitted = { status: 'submitted' };
    const baseWhereAccepted = { status: 'accepted' };
    const includeAssignments = courseId ? [{
      model: Assignments,
      where: { courseId },
      attributes: []
    }] : [];

    const [pendingCount, reviewedCount, { count, rows }] = await Promise.all([
      AssignmentSubmissions.count({
        where: baseWhereSubmitted,
        include: includeAssignments
      }),
      AssignmentSubmissions.count({
        where: baseWhereAccepted,
        include: includeAssignments
      }),
      AssignmentSubmissions.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Assignments,
            where: courseId ? { courseId } : undefined,
            include: [
              {
                model: Courses,
                attributes: ['courseName'],
                as: 'Course'
              }
            ]
          },
          {
            model: Users,
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['submittedAt', 'DESC']],
        limit: pageSize,
        offset
      })
    ]);

    return res.json({
      success: true,
      totalItems: count,
      pageNo,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
      assignments: rows,
      status: {
        pendingCount,
        reviewedCount
      },
      statusOptions: [
        { value: 'pending', label: 'Pending' },
        { value: 'reviewed', label: 'Reviewed' }
      ]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get single assignment submission details
const getAssignmentSubmissionDetails = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await AssignmentSubmissions.findOne({
      where: { id: submissionId },
      include: [
        {
          model: Assignments,
          include: [
            {
              model: Courses,
              attributes: ['courseName'],
              as: 'Course'
            }
          ]
        },
        {
          model: Users,
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    return res.json({
      success: true,
      submission
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

// update assignment status by admin
const updateAssignmentStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, feedback } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either accepted or rejected' });
    }

    const submission = await AssignmentSubmissions.findByPk(submissionId);

    if (!submission) {
      return res.status(404).json({ message: 'Assignment submission not found' });
    }

    await submission.update({
      status,
      feedback: feedback || null
    });

    res.json({
      success: true,
      message: 'Assignment status updated successfully'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  createAssignment,
  getMyAssignments,
  getMyAssignmentStats,
  getSubmittedAssignments,
  getAssignmentSubmissionDetails,
  submitAssignment,
  updateAssignmentStatus
}