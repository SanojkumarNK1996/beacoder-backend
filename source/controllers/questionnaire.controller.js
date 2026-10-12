const { Op } = require('sequelize');
const Tests = require('../models/Tests.model');
const UserTestResults = require('../models/UserTestResults.model');
const Users = require('../models/Users.model');
const StudentActivity = require('../models/StudentActivity.model');
const QuizQuestions = require('../models/QuizQuestion.model');
const Subtopics = require('../models/Subtopics.model');
const CourseTopics = require('../models/CourseTopics.model');
const Courses = require('../models/Courses.model');
const db = require('../config/db');

const isAdmin = (req) => req.user?.role === 'admin';
const testIdFrom = (req) => Number.isSafeInteger(Number(req.params.testId)) && Number(req.params.testId) > 0
  ? Number(req.params.testId) : null;
const safeQuestion = (question) => ({
  questionKey: question.questionKey,
  subtopicKey: question.subtopicKey,
  question: question.question,
  type: question.type,
  difficulty: question.difficulty,
  timeLimitSeconds: question.timeLimitSeconds,
  content: question.content,
  explanation: question.explanation,
  answer: question.answer,
  isActive: question.isActive,
});

const testDescriptionFrom = (value) => typeof value === 'string' ? value.trim() : '';

const resolveQuestions = async (keys, { requireActive = true } = {}) => {
  if (!Array.isArray(keys) || keys.length === 0 || keys.some((key) => typeof key !== 'string' || !key.trim()) ||
      new Set(keys).size !== keys.length) return { error: 'Select one or more unique question keys.' };
  const rows = await QuizQuestions.findAll({ where: { questionKey: { [Op.in]: keys }, ...(requireActive ? { isActive: true } : {}) } });
  const byKey = new Map(rows.map((question) => [question.questionKey, question]));
  if (keys.some((key) => !byKey.has(key))) return { error: 'A selected question is missing or inactive.' };
  const ordered = keys.map((key) => byKey.get(key));
  if (ordered.some((question) => question.type !== 'MCQ' || !Array.isArray(question.content?.options) ||
      !Array.isArray(question.answer?.correct_options) || question.answer.correct_options.length !== 1)) {
    return { error: 'Questionnaires support only MCQs with exactly one configured correct answer.' };
  }
  return { questions: ordered };
};

const canEdit = (test, req) => isAdmin(req) || Number(test.createdBy) === Number(req.user.id);

const listTests = async (req, res) => {
  try {
    const where = isAdmin(req) ? {} : { createdBy: req.user.id };
    const tests = await Tests.findAll({ where, order: [['testName', 'ASC'], ['id', 'ASC']] });
    return res.json({ success: true, data: tests });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load questionnaires.' });
  }
};

const createTest = async (req, res) => {
  try {
    const testName = typeof req.body?.testName === 'string' ? req.body.testName.trim() : '';
    if (!testName || testName.length > 160) return res.status(400).json({ message: 'Test name is required (160 characters maximum).' });
    const description = testDescriptionFrom(req.body?.description);
    if (description.length > 2000) return res.status(400).json({ message: 'Description must be 2000 characters or fewer.' });
    const parsed = await resolveQuestions(req.body.questionKeys);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const test = await Tests.create({ testName, description, createdBy: req.user.id, questionKeys: req.body.questionKeys, questionCount: parsed.questions.length });
    return res.status(201).json({ success: true, data: test });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create questionnaire.' });
  }
};

const updateTest = async (req, res) => {
  try {
    const id = testIdFrom(req);
    if (!id) return res.status(400).json({ message: 'Invalid test ID.' });
    const test = await Tests.findByPk(id);
    if (!test) return res.status(404).json({ message: 'Questionnaire not found.' });
    if (!canEdit(test, req)) return res.status(403).json({ message: 'You cannot edit this questionnaire.' });
    const testName = typeof req.body?.testName === 'string' ? req.body.testName.trim() : '';
    if (!testName || testName.length > 160) return res.status(400).json({ message: 'Test name is required (160 characters maximum).' });
    const description = testDescriptionFrom(req.body?.description);
    if (description.length > 2000) return res.status(400).json({ message: 'Description must be 2000 characters or fewer.' });
    const parsed = await resolveQuestions(req.body.questionKeys);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    await test.update({ testName, description, questionKeys: req.body.questionKeys, questionCount: parsed.questions.length });
    return res.json({ success: true, data: test });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update questionnaire.' });
  }
};

const assignTest = async (req, res) => {
  try {
    const id = testIdFrom(req);
    if (!id) return res.status(400).json({ message: 'Invalid test ID.' });
    const test = await Tests.findByPk(id);
    if (!test || !test.isActive) return res.status(404).json({ message: 'Questionnaire not found.' });
    if (!canEdit(test, req)) return res.status(403).json({ message: 'You cannot assign this questionnaire.' });
    const rawIds = req.body?.userIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.some((value) => !Number.isSafeInteger(Number(value)) || Number(value) < 1)) {
      return res.status(400).json({ message: 'Provide one or more valid student user IDs.' });
    }
    const userIds = [...new Set(rawIds.map(Number))];
    const students = await Users.findAll({ where: { id: { [Op.in]: userIds }, role: 'student', isActive: true }, attributes: ['id'] });
    if (students.length !== userIds.length) return res.status(400).json({ message: 'Every selected user must be an active student.' });
    const assignments = [];
    for (const userId of userIds) {
      const [record, created] = await UserTestResults.findOrCreate({
        where: { userId, testId: id },
        defaults: { userId, testId: id, assignedById: req.user.id, status: 'NEW' },
      });
      if (!created && record.status === 'NEW') await record.update({ assignedById: req.user.id });
      assignments.push({ userId, status: record.status, created });
    }
    return res.status(201).json({ success: true, data: assignments });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to assign questionnaire.' });
  }
};

const allowRetake = async (req, res) => {
  const id = testIdFrom(req);
  const studentId = Number(req.params.userId);
  if (!id || !Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(400).json({ message: 'A valid questionnaire and student ID are required.' });
  }
  try {
    const test = await Tests.findByPk(id);
    if (!test || !test.isActive) return res.status(404).json({ message: 'Active questionnaire not found.' });
    if (!canEdit(test, req)) return res.status(403).json({ message: 'You cannot allow a retake for this questionnaire.' });

    const transaction = await db.pgConn.transaction();
    try {
      const result = await UserTestResults.findOne({
        where: { testId: id, userId: studentId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!result) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Student questionnaire result not found.' });
      }
      if (result.status !== 'COMPLETED') {
        await transaction.rollback();
        return res.status(409).json({ message: 'Only completed questionnaires can be reopened.' });
      }

      await result.update({
        status: 'NEW',
        earnedMarks: null,
        totalMarks: null,
        courseMarks: null,
        topicMarks: null,
        completedAt: null,
      }, { transaction });
      await transaction.commit();
      return res.json({ success: true, data: { status: 'NEW', testId: id, userId: studentId } });
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  } catch (error) {
    return res.status(500).json({ message: 'Unable to allow questionnaire retake.' });
  }
};

const searchStudents = async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const students = await Users.findAll({
      where: {
        role: 'student',
        isActive: true,
        ...(search ? { [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ] } : {}),
      },
      attributes: ['id', 'name', 'email'],
      limit: 30,
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: students });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to search students.' });
  }
};

const listMyTests = async (req, res) => {
  try {
    const records = await UserTestResults.findAll({
      where: { userId: req.user.id },
      include: [{ model: Tests, as: 'test', attributes: ['id', 'testName', 'description', 'questionCount'] }],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load your tests.' });
  }
};

const startTest = async (req, res) => {
  try {
    const id = testIdFrom(req);
    if (!id) return res.status(400).json({ message: 'Invalid test ID.' });
    const result = await UserTestResults.findOne({ where: { userId: req.user.id, testId: id } });
    if (!result) return res.status(404).json({ message: 'This test has not been assigned to you.' });
    if (result.status !== 'NEW') return res.status(409).json({ message: 'This test is already completed.' });
    const test = await Tests.findOne({ where: { id, isActive: true } });
    if (!test) return res.status(404).json({ message: 'Test not found.' });
    const parsed = await resolveQuestions(test.questionKeys);
    if (parsed.error) return res.status(409).json({ message: parsed.error });
    return res.json({ success: true, test: { id, testName: test.testName, description: test.description || '' }, questions: parsed.questions.map((question) => {
      const safe = safeQuestion(question);
      delete safe.answer;
      delete safe.explanation;
      return safe;
    }) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to start test.' });
  }
};

const mentorTestPreview = async (req, res) => {
  try {
    const id = testIdFrom(req);
    if (!id) return res.status(400).json({ message: 'Invalid test ID.' });
    const test = await Tests.findByPk(id);
    if (!test) return res.status(404).json({ message: 'Questionnaire not found.' });
    if (!canEdit(test, req)) return res.status(403).json({ message: 'You cannot preview this questionnaire.' });
    const parsed = await resolveQuestions(test.questionKeys, { requireActive: false });
    if (parsed.error) return res.status(409).json({ message: parsed.error });
    return res.json({ success: true, data: { ...test.get({ plain: true }), questions: parsed.questions.map(safeQuestion) } });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to preview questionnaire.' });
  }
};

const submitTest = async (req, res) => {
  const transaction = await db.pgConn.transaction();
  try {
    const id = testIdFrom(req);
    if (!id) { await transaction.rollback(); return res.status(400).json({ message: 'Invalid test ID.' }); }
    const result = await UserTestResults.findOne({ where: { userId: req.user.id, testId: id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!result) { await transaction.rollback(); return res.status(404).json({ message: 'This test has not been assigned to you.' }); }
    if (result.status !== 'NEW') { await transaction.rollback(); return res.status(409).json({ message: 'This test is already completed.' }); }
    const test = await Tests.findByPk(id, { transaction });
    if (!test) { await transaction.rollback(); return res.status(404).json({ message: 'Test not found.' }); }
    const answers = req.body?.answers;
    if (!Array.isArray(answers) || answers.length !== test.questionKeys.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Submit one answer for every test question.' });
    }
    const keys = answers.map((answer) => answer?.questionKey);
    if (new Set(keys).size !== keys.length || test.questionKeys.some((key) => !keys.includes(key)) ||
        answers.some((answer) => !Array.isArray(answer.selectedOptions) || answer.selectedOptions.length > 1 ||
          !answer.selectedOptions.every((item) => typeof item === 'string'))) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Answers must contain unique question keys and at most one selected option per question.' });
    }
    const parsed = await resolveQuestions(test.questionKeys, { requireActive: false });
    if (parsed.error) { await transaction.rollback(); return res.status(409).json({ message: parsed.error }); }
    const subtopicKeys = [...new Set(parsed.questions.map((question) => question.subtopicKey))];
    const subtopics = await Subtopics.findAll({ where: { subtopicKey: { [Op.in]: subtopicKeys } }, attributes: ['subtopicKey', 'title', 'topicId'], transaction });
    const topicIds = [...new Set(subtopics.map((topic) => topic.topicId))];
    const topics = await CourseTopics.findAll({ where: { id: { [Op.in]: topicIds } }, attributes: ['id', 'title', 'courseId'], transaction });
    const courseIds = [...new Set(topics.map((topic) => topic.courseId))];
    const courses = await Courses.findAll({ where: { id: { [Op.in]: courseIds } }, attributes: ['id', 'courseName'], transaction });
    const subtopicByKey = new Map(subtopics.map((row) => [row.subtopicKey, row]));
    const topicById = new Map(topics.map((row) => [Number(row.id), row]));
    const courseById = new Map(courses.map((row) => [Number(row.id), row]));
    const answerByKey = new Map(answers.map((answer) => [answer.questionKey, [...new Set(answer.selectedOptions)].sort()]));
    const courseTotals = new Map();
    let earnedMarks = 0;
    let totalMarks = 0;
    for (const question of parsed.questions) {
      const expected = [...new Set(question.answer?.correct_options || [])].sort();
      const selected = answerByKey.get(question.questionKey) || [];
      const correct = expected.length > 0 && expected.length === selected.length && expected.every((option, index) => option === selected[index]);
      const subtopic = subtopicByKey.get(question.subtopicKey);
      const topic = topicById.get(Number(subtopic?.topicId));
      const course = courseById.get(Number(topic?.courseId));
      const courseKey = String(course?.id ?? 'unknown');
      const topicKey = String(topic?.id ?? 'unknown');
      const courseName = course?.courseName || 'Unknown course';
      const topicName = topic?.title || 'Unknown topic';
      earnedMarks += correct ? 1 : 0;
      totalMarks += 1;
      const courseMark = courseTotals.get(courseKey) || { courseName, earnedMarks: 0, totalMarks: 0, topics: new Map() };
      courseMark.totalMarks += 1;
      if (correct) courseMark.earnedMarks += 1;
      const topicMark = courseMark.topics.get(topicKey) || { topicName, earnedMarks: 0, totalMarks: 0 };
      topicMark.totalMarks += 1;
      if (correct) topicMark.earnedMarks += 1;
      courseMark.topics.set(topicKey, topicMark);
      courseTotals.set(courseKey, courseMark);
    }
    const courseMarks = [...courseTotals.values()].map((course) => ({
      ...course,
      topics: [...course.topics.values()],
    }));
    const topicMarks = courseMarks.flatMap((course) => course.topics.map((topic) => ({ courseName: course.courseName, ...topic })));
    const completedAt = new Date();
    await result.update({ status: 'COMPLETED', earnedMarks, totalMarks, courseMarks, topicMarks, completedAt }, { transaction });
    const percentage = totalMarks ? Math.round(earnedMarks / totalMarks * 100) : 0;
    await StudentActivity.create({
      studentId: req.user.id,
      recordedById: req.user.id,
      activityDate: completedAt.toISOString().slice(0, 10),
      title: 'Completed assigned questionnaire',
      details: `${test.testName} — Score: ${earnedMarks}/${totalMarks} (${percentage}%).`,
    }, { transaction });
    await transaction.commit();
    return res.json({ success: true, data: { status: 'COMPLETED', earnedMarks, totalMarks, percentage, courseMarks } });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    return res.status(500).json({ message: 'Unable to submit test.' });
  }
};

const searchResults = async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const studentSearch = typeof req.query.studentSearch === 'string' ? req.query.studentSearch.trim() : '';
    const statusFilter = req.query.status;
    if (statusFilter && !['NEW', 'COMPLETED'].includes(statusFilter)) {
      return res.status(400).json({ message: 'Status must be NEW or COMPLETED.' });
    }
    const tests = await Tests.findAll({ where: { ...(isAdmin(req) ? {} : { createdBy: req.user.id }), ...(search ? { testName: { [Op.iLike]: `%${search}%` } } : {}) }, attributes: ['id'] });
    const testIds = tests.map((test) => test.id);
    if (!testIds.length) return res.json({ success: true, data: [] });
    let userIds;
    if (studentSearch) {
      const students = await Users.findAll({
        where: { role: 'student', [Op.or]: [
          { name: { [Op.iLike]: `%${studentSearch}%` } },
          { email: { [Op.iLike]: `%${studentSearch}%` } },
        ] },
        attributes: ['id'],
      });
      userIds = students.map((student) => student.id);
      if (!userIds.length) return res.json({ success: true, data: [] });
    }
    const records = await UserTestResults.findAll({
      where: { testId: { [Op.in]: testIds }, ...(userIds ? { userId: { [Op.in]: userIds } } : {}), ...(statusFilter ? { status: statusFilter } : {}) },
      include: [
        { model: Tests, as: 'test', attributes: ['id', 'testName'] },
        { model: Users, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
      order: [['updatedAt', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to search test results.' });
  }
};

module.exports = { listTests, createTest, updateTest, assignTest, allowRetake, listMyTests, startTest, submitTest, mentorTestPreview, searchStudents, searchResults };
