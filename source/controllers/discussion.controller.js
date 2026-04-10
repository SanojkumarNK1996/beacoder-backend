const { Op } = require('sequelize');
const Discussions = require('../models/Discussion.model');
const DiscussionReply = require('../models/DiscussionReply.model');
const CourseEnrollments = require('../models/CourseEnrollments.model');
const Courses = require('../models/Courses.model');
const Assignments = require('../models/Assignment.model');
const Users = require('../models/Users.model');

const createDiscussion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, courseId, assignmentId } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'title and description are required' });
    }

    if (courseId) {
      const enrollment = await CourseEnrollments.findOne({
        where: {
          userId,
          courseId,
          isActive: true,
        }
      });

      if (!enrollment) {
        return res.status(403).json({ message: 'User is not enrolled in the provided course' });
      }
    }

    const discussion = await Discussions.create({
      userId,
      courseId: courseId || null,
      assignmentId: assignmentId || null,
      title,
      description,
      status: 'open'
    });

    return res.status(201).json({ success: true, data: discussion });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getStudentDiscussions = async (req, res) => {
  try {
    const userId = req.user.id;
    const scope = (req.query.scope || 'all').toLowerCase();

    const enrollmentRows = await CourseEnrollments.findAll({
      where: { userId, isActive: true },
      attributes: ['courseId']
    });

    const enrolledCourseIds = enrollmentRows.map(row => row.courseId);

    let whereClause;

    if (scope === 'me') {
      whereClause = { userId };
    } else {
      whereClause = {
        [Op.or]: [
          { userId },
          { courseId: enrolledCourseIds.length > 0 ? enrolledCourseIds : -1 },
          { courseId: null }
        ]
      };
    }

    const discussions = await Discussions.findAll({
      where: whereClause,
      include: [
        { model: Users, as: 'User', attributes: ['id', 'name', 'email'] },
        { model: Courses, as: 'Course', attributes: ['id', 'courseName', 'courseCode'] },
        { model: Assignments, as: 'Assignment' },
        { model: DiscussionReply, include: [{ model: Users, as: 'User', attributes: ['id', 'name', 'email'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const result = discussions.map(discussion => {
      const plain = discussion.toJSON();
      plain.replyCount = Array.isArray(plain.DiscussionReplies) ? plain.DiscussionReplies.length : 0;
      return plain;
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getStudentDiscussionById = async (req, res) => {
  try {
    const userId = req.user.id;
    const discussionId = parseInt(req.params.id, 10);
    if (isNaN(discussionId)) {
      return res.status(400).json({ message: 'Invalid discussion id' });
    }

    const discussion = await Discussions.findOne({
      where: { id: discussionId },
      include: [
        { model: Users, as: 'User', attributes: ['id', 'name', 'email'] },
        { model: Courses, as: 'Course', attributes: ['id', 'courseName', 'courseCode'] },
        { model: Assignments, as: 'Assignment' },
        { model: DiscussionReply, include: [{ model: Users, as: 'User', attributes: ['id', 'name', 'email'] }] }
      ]
    });

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.courseId) {
      const enrollment = await CourseEnrollments.findOne({
        where: { userId, courseId: discussion.courseId, isActive: true }
      });
      if (!enrollment && discussion.userId !== userId) {
        return res.status(403).json({ message: 'User is not enrolled in the course for this discussion' });
      }
    }

    const response = discussion.toJSON();
    response.replyCount = Array.isArray(response.DiscussionReplies) ? response.DiscussionReplies.length : 0;

    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createDiscussionReply = async (req, res) => {
  try {
    const userId = req.user.id;
    const discussionId = parseInt(req.params.id, 10);
    const { message } = req.body;

    if (isNaN(discussionId)) {
      return res.status(400).json({ message: 'Invalid discussion id' });
    }
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'message is required' });
    }

    const discussion = await Discussions.findByPk(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.courseId) {
      const enrollment = await CourseEnrollments.findOne({
        where: { userId, courseId: discussion.courseId, isActive: true }
      });
      if (!enrollment && discussion.userId !== userId) {
        return res.status(403).json({ message: 'User must be enrolled in the course to reply' });
      }
    }

    const reply = await DiscussionReply.create({
      discussionId,
      userId,
      message
    });

    const response = await DiscussionReply.findByPk(reply.id, {
      include: [{ model: Users, as: 'User', attributes: ['id', 'name', 'email'] }]
    });

    return res.status(201).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createAdminDiscussionReply = async (req, res) => {
  try {
    const userId = req.user.id;
    const discussionId = parseInt(req.params.id, 10);
    const { message } = req.body;

    if (isNaN(discussionId)) {
      return res.status(400).json({ message: 'Invalid discussion id' });
    }
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'message is required' });
    }

    const discussion = await Discussions.findByPk(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const reply = await DiscussionReply.create({
      discussionId,
      userId,
      message
    });

    const response = await DiscussionReply.findByPk(reply.id, {
      include: [{ model: Users, as: 'User', attributes: ['id', 'name', 'email'] }]
    });

    return res.status(201).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


const getAdminDiscussions = async (req, res) => {
  try {
    const courseIdParam = req.query.courseId;
    const whereClause = {};

    if (courseIdParam !== undefined) {
      const courseId = parseInt(courseIdParam, 10);
      if (isNaN(courseId)) {
        return res.status(400).json({ message: 'Invalid courseId' });
      }
      whereClause.courseId = courseId;
    }

    const discussions = await Discussions.findAll({
      where: whereClause,
      include: [
        { model: Users, as: 'User', attributes: ['id', 'name', 'email'] },
        { model: Courses, as: 'Course', attributes: ['id', 'courseName', 'courseCode'] },
        { model: Assignments, as: 'Assignment' },
        { model: DiscussionReply, include: [{ model: Users, as: 'User', attributes: ['id', 'name', 'email'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const result = discussions.map(discussion => {
      const plain = discussion.toJSON();
      plain.replyCount = Array.isArray(plain.DiscussionReplies) ? plain.DiscussionReplies.length : 0;
      return plain;
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAdminPairProgrammingDiscussions = async (req, res) => {
  try {
    const courseIdParam = req.query.courseId;
    const statusParam = req.query.status;
    const whereClause = { isPairProgramming: true };

    if (courseIdParam !== undefined) {
      const courseId = parseInt(courseIdParam, 10);
      if (isNaN(courseId)) {
        return res.status(400).json({ message: 'Invalid courseId' });
      }
      whereClause.courseId = courseId;
    }

    if (statusParam !== undefined) {
      const status = statusParam.toLowerCase();
      if (status === 'pending') {
        whereClause.pairProgrammingStatus = false;
      } else if (status === 'completed') {
        whereClause.pairProgrammingStatus = true;
      } else {
        return res.status(400).json({ message: 'Invalid status' });
      }
    }

    const discussions = await Discussions.findAll({
      where: whereClause,
      include: [
        { model: Users, as: 'User', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Courses, as: 'Course', attributes: ['id', 'courseName', 'courseCode'] },
        { model: Assignments, as: 'Assignment' },
        { model: DiscussionReply, include: [{ model: Users, as: 'User', attributes: ['id', 'name', 'email'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const result = discussions.map(discussion => {
      const plain = discussion.toJSON();
      const response = {
        _id: plain.id,
        user: {
          name: plain.User?.name,
          email: plain.User?.email,
          phone: plain.User?.phone
        },
        bookedSlot: plain.bookedSlot,
        courseName: plain.Course?.courseName,
        courseId: plain.Course?.id,
        pairProgrammingStatus: plain.pairProgrammingStatus,
      };

      if (plain.Assignment?.title) {
        response.assignmentTitle = plain.Assignment.title;
      }

      return response;
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAdminDiscussionById = async (req, res) => {
  try {
    const discussionId = parseInt(req.params.id, 10);

    if (isNaN(discussionId)) {
      return res.status(400).json({ message: 'Invalid discussion id' });
    }

    const discussion = await Discussions.findOne({
      where: { id: discussionId },
      include: [
        { model: Users, as: 'User', attributes: ['id', 'name', 'email'] },
        { model: Courses, as: 'Course', attributes: ['id', 'courseName', 'courseCode'] },
        { model: Assignments, as: 'Assignment' },
        { model: DiscussionReply, include: [{ model: Users, as: 'User', attributes: ['id', 'name', 'email'] }] }
      ]
    });

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const response = discussion.toJSON();
    response.replyCount = Array.isArray(response.DiscussionReplies) ? response.DiscussionReplies.length : 0;

    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateDiscussionStatus = async (req, res) => {
  try {
    const discussionId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isNaN(discussionId)) {
      return res.status(400).json({ message: 'Invalid discussion id' });
    }

    const allowed = ['open', 'closed'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const discussion = await Discussions.findByPk(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    discussion.status = status;

    await discussion.save();

    return res.status(200).json({ success: true, data: discussion });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updatePairProgrammingRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { discussionId } = req.params
    const { bookedSlot } = req.body;

    if (!discussionId || isNaN(parseInt(discussionId, 10))) {
      return res.status(400).json({ message: 'Invalid discussion id' });
    }

    if (!bookedSlot) {
      return res.status(400).json({ message: 'bookedSlot is required' });
    }

    const discussion = await Discussions.findByPk(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.userId !== userId) {
      return res.status(403).json({ message: 'Only the discussion creator can raise a pair programming request' });
    }

    // const createdTime = new Date(discussion.createdAt).getTime();
    // const now = Date.now();
    // const ageMs = now - createdTime;
    // const minAgeMs = 48 * 60 * 60 * 1000;

    // if (ageMs < minAgeMs) {
    //   return res.status(400).json({ message: 'Pair programming request can only be updated after 48 hours of discussion creation' });
    // }

    discussion.isPairProgramming = true;
    discussion.bookedSlot = bookedSlot;

    await discussion.save();

    const response = await Discussions.findByPk(discussionId, {
      include: [
        { model: Users, as: 'User', attributes: ['id', 'name', 'email'] },
        { model: Courses, as: 'Course', attributes: ['id', 'courseName', 'courseCode'] },
        { model: Assignments, as: 'Assignment' }
      ]
    });

    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updatePairProgrammingStatus = async (req, res) => {
  try {
    const discussionId = parseInt(req.params.id, 10);

    if (isNaN(discussionId)) {
      return res.status(400).json({ message: 'Invalid discussion id' });
    }

    const discussion = await Discussions.findByPk(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    discussion.pairProgrammingStatus = true;
    await discussion.save();

    return res.status(200).json({ success: true, message: 'Pair programming status updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDiscussion,
  getStudentDiscussions,
  getStudentDiscussionById,
  createDiscussionReply,
  createAdminDiscussionReply,
  getAdminDiscussions,
  getAdminPairProgrammingDiscussions,
  getAdminDiscussionById,
  updateDiscussionStatus,
  updatePairProgrammingRequest,
  updatePairProgrammingStatus
};
