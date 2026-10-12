const { Op } = require('sequelize');
const Assignments = require('../models/Assignment.model');
const Courses = require('../models/Courses.model');
const CourseTopics = require('../models/CourseTopics.model');
const Subtopics = require('../models/Subtopics.model');
const CourseEnrollments = require('../models/CourseEnrollments.model');
const Users = require('../models/Users.model');
const userAssignmentsModel = require('../models/UserAssignments.model');
const UserAssignments = userAssignmentsModel.UserAssignments || userAssignmentsModel;
const assignmentDifficulties = new Set(['easy', 'medium', 'tough']);

const assignmentCourseInclude = (courseId) => ({
  model: Subtopics,
  as: 'Subtopic',
  required: true,
  include: [{
    model: CourseTopics,
    required: true,
    where: courseId ? { courseId } : undefined,
    include: [{ model: Courses, as: 'Course' }],
  }],
});

const parseId = (value) => {
  if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const normalizeAssignmentDescription = (description) => {
  if (!description || typeof description !== 'object' || Array.isArray(description)) {
    const error = new Error('Description must be a structured JSON object.');
    error.statusCode = 400;
    throw error;
  }
  const normalized = {};
  for (const field of ['task', 'learningBenefits', 'context', 'expectedOutput']) {
    if (typeof description[field] !== 'string' || !description[field].trim()) {
      const error = new Error(`description.${field} must be a non-empty string.`);
      error.statusCode = 400;
      throw error;
    }
    normalized[field] = description[field].trim();
  }
  return normalized;
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const nextAssignmentKey = async (subtopicKey) => {
  const prefix = `${subtopicKey}_assignment_`;
  const assignments = await Assignments.findAll({
    where: { subtopicKey },
    attributes: ['assignmentKey'],
  });
  const highestNumber = assignments.reduce((highest, assignment) => {
    const key = assignment.assignmentKey || '';
    if (!key.startsWith(prefix)) return highest;
    const suffix = key.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return highest;
    return Math.max(highest, Number(suffix));
  }, 0);
  return `${prefix}${String(highestNumber + 1).padStart(3, '0')}`;
};

const createAssignmentWithNextKey = async (subtopicKey, values) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const assignmentKey = await nextAssignmentKey(subtopicKey);
    try {
      return await Assignments.create({ ...values, assignmentKey });
    } catch (error) {
      const isUniqueConflict = error?.name === 'SequelizeUniqueConstraintError' || error?.original?.code === '23505';
      if (!isUniqueConflict || attempt === 2) throw error;
    }
  }
  throw new Error('Could not allocate a unique assignment key.');
};

const validateHierarchy = async ({ courseId, topicId, subtopicKey }) => {
  const parsedCourseId = parseId(courseId);
  if (!parsedCourseId) return { error: 'A valid courseId is required' };

  const course = await Courses.findByPk(parsedCourseId);
  if (!course) return { error: 'Course not found', status: 404 };

  const parsedTopicId = topicId == null || topicId === '' ? null : parseId(topicId);
  if (topicId != null && topicId !== '' && !parsedTopicId) {
    return { error: 'topicId must be a valid ID' };
  }

  let topic = null;
  let subtopic = null;
  if (parsedTopicId) {
    topic = await CourseTopics.findByPk(parsedTopicId);
    if (!topic || Number(topic.courseId) !== parsedCourseId) {
      return { error: 'Topic does not belong to the specified course' };
    }
  }

  const normalizedSubtopicKey = typeof subtopicKey === 'string' ? subtopicKey.trim() : '';
  if (normalizedSubtopicKey) {
    subtopic = await Subtopics.findOne({ where: { subtopicKey: normalizedSubtopicKey } });
    if (!subtopic) return { error: 'Subtopic not found', status: 404 };
    if (parsedTopicId && Number(subtopic.topicId) !== parsedTopicId) {
      return { error: 'Subtopic does not belong to the specified topic' };
    }
    if (!topic) {
      topic = await CourseTopics.findByPk(subtopic.topicId);
      if (!topic || Number(topic.courseId) !== parsedCourseId) {
        return { error: 'Subtopic does not belong to the specified course' };
      }
    }
  }

  return {
    course,
    topic,
    subtopic,
    courseId: parsedCourseId,
    topicId: parsedTopicId,
    subtopicKey: subtopic?.subtopicKey || null,
  };
};

const createAssignment = async (req, res) => {
  try {
    const { title, difficulty, description, subtopicKey, displayOrder } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title must be a non-empty string.' });
    }
    if (!assignmentDifficulties.has(difficulty)) {
      return res.status(400).json({ message: 'difficulty must be easy, medium, or tough.' });
    }
    const normalizedDescription = normalizeAssignmentDescription(description);

    if (typeof subtopicKey !== 'string' || !subtopicKey.trim()) {
      return res.status(400).json({ message: 'A valid subtopicKey is required.' });
    }
    const normalizedDisplayOrder = displayOrder == null ? 1 : Number(displayOrder);
    if (!Number.isInteger(normalizedDisplayOrder) || normalizedDisplayOrder < 1) {
      return res.status(400).json({ message: 'displayOrder must be a positive integer.' });
    }
    const subtopic = await Subtopics.findOne({ where: { subtopicKey: subtopicKey.trim() } });
    if (!subtopic) return res.status(404).json({ message: 'Subtopic not found.' });
    const assignment = await createAssignmentWithNextKey(subtopic.subtopicKey, {
      title: title.trim(),
      difficulty,
      description: normalizedDescription,
      subtopicKey: subtopic.subtopicKey,
      displayOrder: normalizedDisplayOrder,
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const assignmentId = parseId(req.params.assignmentId);
    if (!assignmentId) return res.status(400).json({ message: 'A valid assignmentId is required.' });

    const assignment = await Assignments.findByPk(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    const body = req.body || {};
    const allowedFields = new Set(['title', 'difficulty', 'description', 'displayOrder']);
    const invalidFields = Object.keys(body).filter((field) => !allowedFields.has(field));
    if (invalidFields.length) {
      return res.status(400).json({ message: 'Unsupported assignment fields.', invalidFields });
    }

    const updates = {};
    if (Object.hasOwn(body, 'title')) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return res.status(400).json({ message: 'title must be a non-empty string.' });
      }
      updates.title = body.title.trim();
    }
    if (Object.hasOwn(body, 'description')) {
      if (!body.description || typeof body.description !== 'object' || Array.isArray(body.description)) {
        return res.status(400).json({ message: 'Description must be a structured JSON object.' });
      }
      updates.description = normalizeAssignmentDescription(body.description);
    }
    if (Object.hasOwn(body, 'difficulty')) {
      if (!assignmentDifficulties.has(body.difficulty)) {
        return res.status(400).json({ message: 'difficulty must be easy, medium, or tough.' });
      }
      updates.difficulty = body.difficulty;
    }
    if (Object.hasOwn(body, 'displayOrder')) {
      const displayOrder = Number(body.displayOrder);
      if (!Number.isInteger(displayOrder) || displayOrder < 1) {
        return res.status(400).json({ message: 'displayOrder must be a positive integer.' });
      }
      updates.displayOrder = displayOrder;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide at least one assignment field to update.' });
    }

    await assignment.update(updates);
    return res.json({ success: true, message: 'Assignment updated successfully.', assignment });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const getAvailableAssignments = async (req, res) => {
  try {
    const hierarchy = await validateHierarchy(req.query);
    if (hierarchy.error) return res.status(hierarchy.status || 400).json({ message: hierarchy.error });

    const topicIds = hierarchy.topicId
      ? [hierarchy.topicId]
      : (await CourseTopics.findAll({ where: { courseId: hierarchy.courseId }, attributes: ['id'] }))
        .map(({ id }) => id);
    const subtopicWhere = hierarchy.subtopicKey
      ? { subtopicKey: hierarchy.subtopicKey }
      : { topicId: { [Op.in]: topicIds } };
    const subtopics = await Subtopics.findAll({ where: subtopicWhere, attributes: ['subtopicKey'] });
    const subtopicKeys = subtopics.map(({ subtopicKey }) => subtopicKey);

    const assignments = await Assignments.findAll({
      where: { subtopicKey: { [Op.in]: subtopicKeys }, isActive: true },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
    return res.json({ success: true, assignments });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getEligibleUsers = async (req, res) => {
  try {
    const courseId = parseId(req.query.courseId);
    if (!courseId) return res.status(400).json({ message: 'A valid courseId is required' });
    const course = await Courses.findByPk(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollments = await CourseEnrollments.findAll({
      where: { courseId, isActive: true },
      include: [{
        model: Users,
        required: true,
        where: { role: 'student', isActive: true },
        attributes: ['id', 'name', 'email'],
      }],
      order: [['id', 'ASC']],
    });

    const users = [...new Map(enrollments.map(({ User: user }) => [user.id, user])).values()];
    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const assignAssignments = async (req, res) => {
  try {
    const { courseId, topicId, subtopicKey, assignmentIds, userIds } = req.body;
    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0 ||
        !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'assignmentIds and userIds must be nonempty arrays' });
    }

    const hierarchy = await validateHierarchy({ courseId, topicId, subtopicKey });
    if (hierarchy.error) return res.status(hierarchy.status || 400).json({ message: hierarchy.error });
    if (!hierarchy.subtopicKey) {
      return res.status(400).json({ message: 'courseId and subtopicKey are required' });
    }

    const parsedAssignmentIds = assignmentIds.map(parseId);
    const parsedUserIds = userIds.map(parseId);
    if (parsedAssignmentIds.includes(null) || parsedUserIds.includes(null)) {
      return res.status(400).json({ message: 'assignmentIds and userIds must contain valid IDs' });
    }

    const uniqueAssignmentIds = [...new Set(parsedAssignmentIds)];
    const uniqueUserIds = [...new Set(parsedUserIds)];
    const validAssignments = await Assignments.findAll({
      where: {
        id: { [Op.in]: uniqueAssignmentIds },
        subtopicKey: hierarchy.subtopicKey,
        isActive: true,
      },
      attributes: ['id'],
    });
    const validAssignmentIds = validAssignments.map(({ id }) => Number(id));
    const invalidAssignmentIds = uniqueAssignmentIds.filter((id) => !validAssignmentIds.includes(id));
    if (invalidAssignmentIds.length) {
      return res.status(400).json({
        message: 'All assignments must be active and belong to the specified subtopic',
        invalidAssignmentIds,
      });
    }

    const enrollments = await CourseEnrollments.findAll({
      where: { courseId: hierarchy.courseId, isActive: true },
      include: [{
        model: Users,
        required: true,
        where: { id: { [Op.in]: uniqueUserIds }, role: 'student', isActive: true },
        attributes: ['id'],
      }],
    });
    const eligibleUserIds = [...new Set(enrollments.map(({ User: user }) => Number(user.id)))];
    const eligibleUserIdSet = new Set(eligibleUserIds);
    const ignoredUserIds = uniqueUserIds.filter((id) => !eligibleUserIdSet.has(id));

    const existingRows = eligibleUserIds.length
      ? await UserAssignments.findAll({
        where: {
          assignmentId: { [Op.in]: uniqueAssignmentIds },
          userId: { [Op.in]: eligibleUserIds },
        },
        attributes: ['assignmentId', 'userId'],
      })
      : [];
    const existingPairs = new Set(existingRows.map(({ assignmentId, userId }) => `${userId}:${assignmentId}`));
    const createdAt = new Date();
    const rowsToCreate = [];
    for (const userId of eligibleUserIds) {
      for (const assignmentId of uniqueAssignmentIds) {
        const key = `${userId}:${assignmentId}`;
        if (!existingPairs.has(key)) {
          rowsToCreate.push({
            userId,
            assignmentId,
            assignedById: req.user.id,
            assignedAt: createdAt,
            status: 'assigned',
          });
        }
      }
    }

    if (rowsToCreate.length) {
      await UserAssignments.bulkCreate(rowsToCreate, { ignoreDuplicates: true });
    }

    const requestedPairCount = parsedAssignmentIds.length * parsedUserIds.length;
    const uniqueRequestedPairCount = uniqueAssignmentIds.length * uniqueUserIds.length;
    const existingPairCount = rowsToCreate.length
      ? eligibleUserIds.length * uniqueAssignmentIds.length - rowsToCreate.length
      : eligibleUserIds.length * uniqueAssignmentIds.length;
    return res.status(201).json({
      success: true,
      requestedCount: requestedPairCount,
      eligibleCount: validAssignmentIds.length * eligibleUserIds.length,
      createdCount: rowsToCreate.length,
      duplicateCount: (requestedPairCount - uniqueRequestedPairCount) + existingPairCount,
      ignoredUserCount: ignoredUserIds.length,
      ignoredUserIds,
      assignmentCount: uniqueAssignmentIds.length,
      eligibleUserCount: eligibleUserIds.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyAssignments = async (req, res) => {
  try {
    const { status } = req.query;
    const validStatuses = ['assigned', 'in_progress', 'submitted', 'completed', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const where = { userId: req.user.id };
    if (status) where.status = status;
    const assignments = await UserAssignments.findAll({
      where,
      include: [{
        model: Assignments,
        as: 'Assignment',
        include: [assignmentCourseInclude()],
      }],
      order: [['assignedAt', 'DESC'], ['id', 'DESC']],
    });
    return res.json({ success: true, assignments });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyAssignmentStats = async (req, res) => {
  try {
    const [pendingCount, submittedCount] = await Promise.all([
      UserAssignments.count({
        where: { userId: req.user.id, status: { [Op.in]: ['assigned', 'in_progress', 'rejected'] } },
      }),
      UserAssignments.count({
        where: { userId: req.user.id, status: { [Op.in]: ['submitted', 'completed'] } },
      }),
    ]);
    return res.json({
      success: true,
      data: { pendingCount, submittedCount },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getSubmittedAssignments = async (req, res) => {
  try {
    const pageNo = req.query.pageNo == null ? 1 : Number(req.query.pageNo);
    const pageSize = req.query.pageSize == null ? 10 : Number(req.query.pageSize);
    const courseId = req.query.courseId == null ? null : parseId(req.query.courseId);
    const status = req.query.status || 'all';
    if (!Number.isInteger(pageNo) || !Number.isInteger(pageSize) || pageNo < 1 || pageSize < 1 ||
        (req.query.courseId != null && !courseId)) {
      return res.status(400).json({ message: 'pageNo, pageSize, and courseId must be valid positive integers' });
    }
    if (!['all', 'pending', 'reviewed', 'submitted', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be all, pending, reviewed, submitted, completed, or rejected' });
    }
    const assignmentStatusWhere = status === 'all'
      ? { status: { [Op.in]: ['submitted', 'completed', 'rejected'] } }
      : status === 'reviewed'
        ? { status: { [Op.in]: ['completed', 'rejected'] } }
        : { status: ['pending', 'submitted'].includes(status) ? 'submitted' : status };

    const assignmentInclude = () => ({
      model: Assignments,
      as: 'Assignment',
      required: true,
      include: [assignmentCourseInclude(courseId)],
    });
    const userInclude = () => ({
      model: Users,
      as: 'User',
      attributes: ['id', 'name', 'email'],
    });
    const [pendingCount, completedCount, rejectedCount, result] = await Promise.all([
      UserAssignments.count({
        where: { status: 'submitted' },
        include: [assignmentInclude()],
        distinct: true,
        col: 'id',
      }),
      UserAssignments.count({
        where: { status: 'completed' },
        include: [assignmentInclude()],
        distinct: true,
        col: 'id',
      }),
      UserAssignments.count({
        where: { status: 'rejected' },
        include: [assignmentInclude()],
        distinct: true,
        col: 'id',
      }),
      UserAssignments.findAndCountAll({
        where: assignmentStatusWhere,
        include: [assignmentInclude(), userInclude()],
        distinct: true,
        col: 'id',
        order: [['submittedAt', 'DESC'], ['id', 'DESC']],
        limit: pageSize,
        offset: (pageNo - 1) * pageSize,
      }),
    ]);
    const reviewedCount = completedCount + rejectedCount;

    return res.json({
      success: true,
      totalItems: result.count,
      pageNo,
      pageSize,
      totalPages: Math.ceil(result.count / pageSize),
      assignments: result.rows,
      pendingCount,
      completedCount,
      rejectedCount,
      reviewedCount,
      status: { pendingCount, completedCount, rejectedCount, reviewedCount },
      statusOptions: [
        { value: 'submitted', label: 'Submitted' },
        { value: 'completed', label: 'Completed' },
        { value: 'rejected', label: 'Rejected' },
      ],
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAssignmentSubmissionDetails = async (req, res) => {
  try {
    const submission = await UserAssignments.findOne({
      where: {
        id: req.params.submissionId,
        status: { [Op.in]: ['submitted', 'completed', 'rejected'] },
      },
      include: [
        {
          model: Assignments,
          as: 'Assignment',
          include: [assignmentCourseInclude()],
        },
        { model: Users, as: 'User', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    return res.json({ success: true, submission });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const startAssignment = async (req, res) => {
  try {
    const userAssignment = await UserAssignments.findByPk(req.params.userAssignmentId);
    if (!userAssignment) return res.status(404).json({ message: 'Assignment allocation not found' });
    if (Number(userAssignment.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'You cannot start another user’s assignment' });
    }
    if (userAssignment.status === 'in_progress') {
      return res.json({ success: true, message: 'Assignment already started', assignment: userAssignment });
    }
    if (userAssignment.status !== 'assigned') {
      return res.status(400).json({ message: 'Only assigned work can be started' });
    }

    await userAssignment.update({
      status: 'in_progress',
      startedAt: userAssignment.startedAt || new Date(),
    });
    return res.json({ success: true, message: 'Assignment started successfully', assignment: userAssignment });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const submitAssignment = async (req, res) => {
  try {
    const allowedFields = new Set(['submissionUrl']);
    const unexpectedFields = Object.keys(req.body || {}).filter((field) => !allowedFields.has(field));
    if (unexpectedFields.length) {
      return res.status(400).json({
        message: 'Only submissionUrl may be provided',
        invalidFields: unexpectedFields,
      });
    }

    const { submissionUrl } = req.body || {};
    const normalizedUrl = typeof submissionUrl === 'string' ? submissionUrl.trim() : '';
    if (!normalizedUrl || !isHttpUrl(normalizedUrl)) {
      return res.status(400).json({ message: 'Provide a valid http or https submissionUrl.' });
    }

    const userAssignment = await UserAssignments.findByPk(req.params.userAssignmentId);
    if (!userAssignment) return res.status(404).json({ message: 'Assignment allocation not found' });
    if (Number(userAssignment.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'You cannot submit another user’s assignment' });
    }
    if (userAssignment.status === 'completed') {
      return res.status(400).json({ message: 'Completed assignments cannot be resubmitted' });
    }

    const wasRejected = userAssignment.status === 'rejected';
    await userAssignment.update({
      textAnswer: null,
      submissionUrl: normalizedUrl || null,
      status: 'submitted',
      submittedAt: new Date(),
      startedAt: userAssignment.startedAt || new Date(),
      ...(wasRejected ? { feedback: null, marksObtained: null, completedAt: null } : {}),
    });
    return res.json({ success: true, message: 'Assignment submitted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateAssignmentStatus = async (req, res) => {
  try {
    const { status, marksObtained, feedback } = req.body || {};
    const unexpectedFields = Object.keys(req.body || {}).filter(
      (field) => !['status', 'marksObtained', 'feedback'].includes(field),
    );
    if (unexpectedFields.length || !['completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Provide status: completed or rejected, with the required review fields',
      });
    }
    if (feedback != null && typeof feedback !== 'string') {
      return res.status(400).json({ message: 'feedback must be a string' });
    }
    if (status === 'completed' && (typeof marksObtained !== 'number' || !Number.isInteger(marksObtained))) {
      return res.status(400).json({ message: 'Completing a review requires integer marksObtained' });
    }
    if (status === 'rejected' && (typeof feedback !== 'string' || !feedback.trim())) {
      return res.status(400).json({ message: 'A non-empty feedback comment is required to reject a submission' });
    }
    if (status === 'rejected' && marksObtained != null) {
      return res.status(400).json({ message: 'marksObtained must not be provided when rejecting a submission' });
    }

    const submission = await UserAssignments.findByPk(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Assignment submission not found' });
    if (!['submitted', 'completed', 'rejected'].includes(submission.status)) {
      return res.status(400).json({ message: 'Only submitted, completed, or rejected assignments can be reviewed' });
    }
    if (status === 'completed' && marksObtained < 0) {
      return res.status(400).json({ message: 'marksObtained must be zero or greater.' });
    }

    if (status === 'completed') {
      await submission.update({
        status: 'completed',
        marksObtained,
        feedback: feedback == null ? null : feedback.trim(),
        completedAt: submission.completedAt || new Date(),
      });
      return res.json({ success: true, message: 'Assignment review completed successfully', submission });
    }

    await submission.update({
      status: 'rejected',
      marksObtained: null,
      feedback: feedback.trim(),
      completedAt: null,
    });
    return res.json({ success: true, message: 'Assignment rejected and feedback sent to the learner', submission });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAssignment,
  updateAssignment,
  getAvailableAssignments,
  getEligibleUsers,
  assignAssignments,
  getMyAssignments,
  getMyAssignmentStats,
  getSubmittedAssignments,
  getAssignmentSubmissionDetails,
  startAssignment,
  submitAssignment,
  updateAssignmentStatus,
};
