const StudentProgress = require('../models/StudentProgress.model');
const CourseEnrollments = require('../models/CourseEnrollments.model');
const Users = require('../models/Users.model');
const UserAssignments = require('../models/UserAssignments.model');
const StudentActivity = require('../models/StudentActivity.model');
const { Op } = require('sequelize');

const getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const [progress] = await StudentProgress.findOrCreate({
      where: { studentId },
      defaults: { studentId },
    });
    const numberOfCourses = await CourseEnrollments.count({
      where: { userId: studentId },
    });

    return res.json({
      success: true,
      data: {
        overallProgress: Number(progress.overallProgress),
        numberOfCourses,
        liveInterviewNumber: progress.liveInterviewNumber,
        onlineMockTestNumber: progress.onlineMockTestNumber,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const incrementOnlineMockTests = async (studentId) => {
  const [progress] = await StudentProgress.findOrCreate({
    where: { studentId },
    defaults: { studentId },
  });
  await progress.increment('onlineMockTestNumber');
};

const parseStudentId = (value) => {
  const studentId = Number(value);
  return Number.isSafeInteger(studentId) && studentId > 0 ? studentId : null;
};

const parseProgressValue = (value, field, { integer = false, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max || (integer && !Number.isInteger(parsed))) {
    const error = new Error(`${field} must be a ${integer ? 'non-negative integer' : `number between 0 and ${max}`}.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

const getManagedProgress = async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const where = { role: 'student' };
    if (search) {
      const conditions = [{ name: { [Op.iLike]: `%${search}%` } }, { email: { [Op.iLike]: `%${search}%` } }];
      if (/^\d+$/.test(search)) conditions.push({ id: Number(search) });
      where[Op.or] = conditions;
    }

    const students = await Users.findAll({
      where,
      attributes: ['id', 'name', 'email'],
      include: [{ model: StudentProgress, as: 'studentProgress', required: false }],
      order: [['name', 'ASC'], ['id', 'ASC']],
    });

    const data = await Promise.all(students.map(async (student) => {
      const progress = student.studentProgress;
      return {
        studentId: student.id,
        name: student.name,
        email: student.email,
        overallProgress: progress ? Number(progress.overallProgress) : 0,
        onlineMockTestNumber: progress?.onlineMockTestNumber || 0,
        numberOfCourses: await CourseEnrollments.count({ where: { userId: student.id } }),
        assignmentTotal: await UserAssignments.count({ where: { userId: student.id } }),
        assignmentCompleted: await UserAssignments.count({ where: { userId: student.id, status: 'completed' } }),
        liveInterviewNumber: progress?.liveInterviewNumber || 0,
      };
    }));

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const saveManagedProgress = async (req, res) => {
  try {
    const studentId = parseStudentId(req.params.studentId);
    if (!studentId) return res.status(400).json({ success: false, message: 'A valid student ID is required.' });

    const student = await Users.findOne({ where: { id: studentId, role: 'student' }, attributes: ['id'] });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const body = req.body || {};
    const updates = {};
    if (body.overallProgress !== undefined) {
      updates.overallProgress = parseProgressValue(body.overallProgress, 'overallProgress', { max: 100 });
    }
    if (body.onlineMockTestNumber !== undefined) {
      updates.onlineMockTestNumber = parseProgressValue(body.onlineMockTestNumber, 'onlineMockTestNumber', { integer: true });
    }
    if (body.liveInterviewNumber !== undefined) {
      updates.liveInterviewNumber = parseProgressValue(body.liveInterviewNumber, 'liveInterviewNumber', { integer: true });
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'At least one progress field is required.' });
    }

    const [progress] = await StudentProgress.findOrCreate({
      where: { studentId },
      defaults: { studentId },
    });
    await progress.update(updates);
    return res.json({ success: true, data: progress });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const parseActivityDate = (value) => {
  if (value === undefined || value === '') return new Date().toISOString().slice(0, 10);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const error = new Error('activityDate must be a valid date in YYYY-MM-DD format.');
    error.statusCode = 400;
    throw error;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    const error = new Error('activityDate must be a valid date in YYYY-MM-DD format.');
    error.statusCode = 400;
    throw error;
  }
  return value;
};

const getStudentActivities = async (req, res) => {
  try {
    const studentId = parseStudentId(req.params.studentId);
    if (!studentId) return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
    const student = await Users.findOne({ where: { id: studentId, role: 'student' }, attributes: ['id'] });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const activities = await StudentActivity.findAll({
      where: { studentId },
      attributes: ['id', 'studentId', 'recordedById', 'activityDate', 'title', 'details', 'createdAt', 'updatedAt'],
      include: [{ model: Users, as: 'recorder', attributes: ['id', 'name'], required: true }],
      order: [['activityDate', 'DESC'], ['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: activities });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const getMyStudentActivities = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can view their own activity timeline.' });
    }
    const activities = await StudentActivity.findAll({
      where: { studentId: req.user.id },
      attributes: ['id', 'activityDate', 'title', 'details', 'createdAt'],
      include: [{ model: Users, as: 'recorder', attributes: ['name'], required: true }],
      order: [['activityDate', 'DESC'], ['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: activities });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createStudentActivity = async (req, res) => {
  try {
    const studentId = parseStudentId(req.params.studentId);
    if (!studentId) return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
    const student = await Users.findOne({ where: { id: studentId, role: 'student' }, attributes: ['id'] });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const details = typeof req.body?.details === 'string' ? req.body.details.trim() : '';
    if (!title || title.length > 120) {
      return res.status(400).json({ success: false, message: 'Title is required and must be 120 characters or fewer.' });
    }
    if (details.length > 5000) {
      return res.status(400).json({ success: false, message: 'Details must be 5000 characters or fewer.' });
    }

    const activity = await StudentActivity.create({
      studentId,
      recordedById: req.user.id,
      activityDate: parseActivityDate(req.body?.activityDate),
      title,
      details: details || null,
    });
    const saved = await StudentActivity.findByPk(activity.id, {
      attributes: ['id', 'studentId', 'recordedById', 'activityDate', 'title', 'details', 'createdAt', 'updatedAt'],
      include: [{ model: Users, as: 'recorder', attributes: ['id', 'name'], required: true }],
    });
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStudentProgress,
  incrementOnlineMockTests,
  getManagedProgress,
  saveManagedProgress,
  getStudentActivities,
  getMyStudentActivities,
  createStudentActivity,
};
