const QuizQuestions = require('../models/QuizQuestion.model');
const Courses = require('../models/Courses.model');
const CourseEnrollments = require('../models/CourseEnrollments.model');
const CourseTopics = require('../models/CourseTopics.model');
const Subtopics = require('../models/Subtopics.model');
const { Op } = require('sequelize');
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'VERY HARD'];

const isValidSubtopicKey = (value) => typeof value === 'string' && value.trim().length > 0;
const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const parsePositiveId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
const hasSingleCorrectOption = (question) => Array.isArray(question.answer?.correct_options) &&
  question.answer.correct_options.length === 1;
const shuffle = (items) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const resolveScope = async ({
  courseId: rawCourseId,
  topicId: rawTopicId,
  subtopicKey: rawSubtopicKey,
  difficulty: rawDifficulty,
}, user) => {
  const difficulty = rawDifficulty == null || rawDifficulty === '' ? null : rawDifficulty;
  if (difficulty && !DIFFICULTIES.includes(difficulty)) {
    return { error: 'difficulty must be EASY, MEDIUM, HARD, or VERY HARD.', status: 400 };
  }

  const courseId = parsePositiveId(rawCourseId);
  if (!courseId) return { error: 'A valid courseId is required.', status: 400 };
  const course = await Courses.findByPk(courseId);
  if (!course) return { error: 'Course not found.', status: 404 };
  if (user?.role === 'student') {
    const enrollment = await CourseEnrollments.findOne({ where: { userId: user.id, courseId, isActive: true } });
    if (!enrollment) return { error: 'You must be enrolled in this course to take its quiz.', status: 403 };
  }

  const topicId = rawTopicId == null || rawTopicId === '' ? null : parsePositiveId(rawTopicId);
  if (rawTopicId != null && rawTopicId !== '' && !topicId) {
    return { error: 'topicId must be a positive integer.', status: 400 };
  }

  let topicIds;
  if (topicId) {
    const topic = await CourseTopics.findOne({ where: { id: topicId, courseId, isActive: true } });
    if (!topic) return { error: 'Topic not found in the selected course.', status: 404 };
    topicIds = [topic.id];
  } else {
    const topics = await CourseTopics.findAll({ where: { courseId, isActive: true }, attributes: ['id'] });
    topicIds = topics.map((topic) => topic.id);
  }

  if (rawSubtopicKey != null && rawSubtopicKey !== '') {
    if (!isValidSubtopicKey(rawSubtopicKey)) return { error: 'A valid subtopicKey is required.', status: 400 };
    const subtopic = await Subtopics.findOne({
      where: { subtopicKey: rawSubtopicKey.trim(), isActive: true },
    });
    if (!subtopic || !topicIds.some((id) => Number(id) === Number(subtopic.topicId))) {
      return { error: 'Subtopic not found in the selected course/topic.', status: 404 };
    }
    return { courseId, topicIds, subtopicKeys: [subtopic.subtopicKey], difficulty };
  }

  if (!topicIds.length) return { courseId, topicIds, subtopicKeys: [], difficulty };
  const subtopics = await Subtopics.findAll({
    where: { topicId: { [Op.in]: topicIds }, isActive: true },
    attributes: ['subtopicKey'],
  });
  return {
    courseId,
    topicIds,
    subtopicKeys: subtopics.map((subtopic) => subtopic.subtopicKey),
    difficulty,
  };
};

const getScopedQuestions = async (scope, attributes, { questionIds } = {}) => {
  if (!scope.subtopicKeys.length) return [];
  const where = {
    subtopicKey: { [Op.in]: scope.subtopicKeys },
    type: 'MCQ',
    isActive: true,
  };
  if (questionIds) where.id = { [Op.in]: questionIds };
  if (scope.difficulty) where.difficulty = scope.difficulty;
  return QuizQuestions.findAll({
    where,
    attributes,
    order: [['displayOrder', 'ASC'], ['id', 'ASC']],
  });
};

const studentQuestion = (question) => ({
  id: question.id,
  questionKey: question.questionKey,
  subtopicKey: question.subtopicKey,
  type: question.type,
  question: question.question,
  difficulty: question.difficulty,
  timeLimitSeconds: question.timeLimitSeconds,
  content: question.content,
  displayOrder: question.displayOrder,
});

const getCourseCatalog = async (req, res) => {
  try {
    const where = { isActive: true };
    if (req.user?.role === 'student') {
      const enrollments = await CourseEnrollments.findAll({
        where: { userId: req.user.id, isActive: true },
        attributes: ['courseId'],
      });
      const enrolledCourseIds = [...new Set(enrollments.map((enrollment) => Number(enrollment.courseId)))];
      if (!enrolledCourseIds.length) return res.json({ success: true, courses: [] });
      where.id = { [Op.in]: enrolledCourseIds };
    }
    const rows = await Courses.findAll({
      where,
      attributes: ['id', 'courseName', 'displayOrder'],
      include: [{
        model: CourseTopics,
        as: 'Topics',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'title', 'displayOrder'],
        include: [{
          model: Subtopics,
          where: { isActive: true },
          required: false,
          attributes: ['id', 'subtopicKey', 'title', 'displayOrder'],
        }],
      }],
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
    const courses = rows.map((row) => {
      const course = row.toJSON ? row.toJSON() : row;
      return {
        ...course,
        topics: (course.Topics || []).map((topic) => ({
          ...topic,
          subtopics: (topic.Subtopics || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
        })).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
      };
    });
    return res.json({ success: true, courses });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const startQuiz = async (req, res) => {
  try {
    const scope = await resolveScope(req.body || {}, req.user);
    if (scope.error) return res.status(scope.status).json({ message: scope.error });

    const requestedLimit = req.body?.limit == null ? 10 : Number(req.body.limit);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
      return res.status(400).json({ message: 'limit must be a positive integer.' });
    }
    const limit = Math.min(requestedLimit, 10);
    const questionBank = await getScopedQuestions(scope, [
      'id', 'questionKey', 'subtopicKey', 'type', 'question', 'difficulty',
      'timeLimitSeconds', 'content', 'displayOrder', 'answer',
    ]);
    const questions = shuffle(questionBank.filter(hasSingleCorrectOption))
      .slice(0, limit)
      .map(studentQuestion);
    return res.json({ success: true, count: questions.length, limit, questions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const submitQuiz = async (req, res) => {
  try {
    const scope = await resolveScope(req.body || {}, req.user);
    if (scope.error) return res.status(scope.status).json({ message: scope.error });

    const answers = req.body?.answers;
    if (!Array.isArray(answers) || answers.length < 1 || answers.length > 10) {
      return res.status(400).json({ message: 'Submit answers for between 1 and 10 questions.' });
    }
    const seenQuestionIds = new Set();
    for (const entry of answers) {
      if (!entry || typeof entry.questionId !== 'string' || !Array.isArray(entry.selectedOptions) ||
          entry.selectedOptions.length > 1 ||
          !entry.selectedOptions.every((option) => typeof option === 'string')) {
      return res.status(400).json({ message: 'Each answer must include a questionId and at most one selected option.' });
      }
      if (!isUuid(entry.questionId)) {
        return res.status(400).json({ message: 'Each questionId must be a valid UUID.' });
      }
      if (seenQuestionIds.has(entry.questionId)) {
        return res.status(400).json({ message: 'Each question can only be submitted once.' });
      }
      seenQuestionIds.add(entry.questionId);
    }

    const questionIds = answers.map((entry) => entry.questionId);
    const scopedQuestions = await getScopedQuestions(scope, [
      'id', 'question', 'content', 'answer', 'explanation',
    ], { questionIds });
    const questionById = new Map(scopedQuestions.map((question) => [String(question.id), question]));
    if (answers.some((entry) => !questionById.has(entry.questionId))) {
      return res.status(400).json({ message: 'One or more questions are not part of this quiz scope.' });
    }
    if (scopedQuestions.some((question) => !hasSingleCorrectOption(question))) {
      return res.status(409).json({ message: 'Quizzes only support questions with exactly one correct option.' });
    }

    let correctCount = 0;
    const incorrectQuestions = [];
    answers.forEach((entry) => {
      const question = questionById.get(entry.questionId);
      const correctOptions = question.answer?.correct_options;
      const expectedOptions = Array.isArray(correctOptions) ? [...new Set(correctOptions)].sort() : [];
      const selectedOptions = [...new Set(entry.selectedOptions)].sort();
      const isCorrect = expectedOptions.length > 0 && selectedOptions.length === expectedOptions.length &&
        selectedOptions.every((option, index) => option === expectedOptions[index]);
      if (isCorrect) {
        correctCount += 1;
      } else {
        const options = Array.isArray(question.content?.options) ? question.content.options : [];
        incorrectQuestions.push({
          questionId: question.id,
          question: question.question,
          selectedAnswers: options.filter((option) => selectedOptions.includes(option.id)).map((option) => option.text),
          correctAnswers: options.filter((option) => expectedOptions.includes(option.id)).map((option) => option.text),
          explanation: question.explanation || 'No explanation has been provided for this question.',
        });
      }
    });

    return res.json({
      success: true,
      score: {
        correctCount,
        questionCount: answers.length,
        percentage: Math.round((correctCount / answers.length) * 100),
      },
      incorrectQuestions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getQuestions = async (req, res) => {
  try {
    const { subtopicKey } = req.params;
    if (!isValidSubtopicKey(subtopicKey)) {
      return res.status(400).json({ message: 'A valid subtopicKey is required.' });
    }

    const subtopic = await Subtopics.findOne({ where: { subtopicKey: subtopicKey.trim() } });
    if (!subtopic) return res.status(404).json({ message: 'Subtopic not found.' });

    const questions = await QuizQuestions.findAll({
      where: { subtopicKey: subtopic.subtopicKey, isActive: true },
      attributes: [
        'id', 'questionKey', 'subtopicKey', 'type', 'question', 'difficulty',
        'timeLimitSeconds', 'content', 'displayOrder', 'answer',
      ],
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
    return res.json({
      success: true,
      questions: questions
        .filter(hasSingleCorrectOption)
        .map(studentQuestion),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAuthoringQuestions = async (req, res) => {
  try {
    const { subtopicKey } = req.params;
    if (!isValidSubtopicKey(subtopicKey)) {
      return res.status(400).json({ message: 'A valid subtopicKey is required.' });
    }

    const subtopic = await Subtopics.findOne({ where: { subtopicKey: subtopicKey.trim() } });
    if (!subtopic) return res.status(404).json({ message: 'Subtopic not found.' });

    const questions = await QuizQuestions.findAll({
      where: { subtopicKey: subtopic.subtopicKey },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
    return res.json({ success: true, questions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getQuestions, getAuthoringQuestions, getCourseCatalog, startQuiz, submitQuiz };
