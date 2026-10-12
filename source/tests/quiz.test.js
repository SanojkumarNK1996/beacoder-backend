const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { Op } = require('sequelize');

const load = (relativePath, dependencies) => {
  const filename = path.join(__dirname, '..', relativePath);
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.require = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  };
  loaded._compile(fs.readFileSync(filename, 'utf8'), filename);
  return loaded.exports;
};

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const makeController = (overrides = {}) => load('controllers/quiz.controller.js', {
  '../models/QuizQuestion.model': {
    findAll: async () => [],
    ...overrides.QuizQuestions,
  },
  '../models/Subtopics.model': {
    findOne: async ({ where }) => ({ subtopicKey: where.subtopicKey }),
    findAll: async () => [],
    ...overrides.Subtopics,
  },
  '../models/Courses.model': {
    findByPk: async (id) => ({ id }),
    ...overrides.Courses,
  },
  '../models/CourseEnrollments.model': {
    findAll: async () => [],
    findOne: async () => null,
    ...overrides.CourseEnrollments,
  },
  '../models/CourseTopics.model': {
    findOne: async ({ where }) => ({ id: where.id, courseId: where.courseId }),
    findAll: async () => [{ id: 10 }],
    ...overrides.CourseTopics,
  },
  sequelize: { Op },
});

test('quiz question model does not store a per-question points field', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'models', 'QuizQuestion.model.js'), 'utf8');
  assert.doesNotMatch(source, /\bpoints\b/);
});

test('learner quiz endpoint returns ordered active question fields without answers or explanations', async () => {
  let query;
  const questions = [{
    id: 'q1',
    questionKey: 'key1',
    subtopicKey: 'react-js-jsx',
    type: 'MCQ',
    question: 'Which syntax embeds a JavaScript expression in JSX?',
    difficulty: 'EASY',
    timeLimitSeconds: 30,
    content: { options: [] },
    displayOrder: 1,
  }];
  const storedQuestions = [{
    ...questions[0],
    answer: { correct_options: ['A'] },
    explanation: 'secret',
  }];
  const controller = makeController({
    QuizQuestions: {
      findAll: async (options) => {
        query = options;
        return storedQuestions.map((row) => Object.fromEntries(options.attributes.map((field) => [field, row[field]])));
      },
    },
  });
  const res = response();

  await controller.getQuestions({ params: { subtopicKey: ' react-js-jsx ' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(query.where, { subtopicKey: 'react-js-jsx', isActive: true });
  assert.equal(query.attributes.includes('answer'), true);
  assert.equal(query.attributes.includes('explanation'), false);
  assert.equal(query.attributes.includes('points'), false);
  assert.deepEqual(query.order, [['displayOrder', 'ASC'], ['id', 'ASC']]);
  assert.deepEqual(res.body.questions, questions);
});

test('authoring endpoint returns answer keys for valid subtopics', async () => {
  const questions = [{ questionKey: 'key', answer: { correct_options: ['A'] } }];
  const controller = makeController({
    QuizQuestions: { findAll: async () => questions },
  });
  const res = response();

  await controller.getAuthoringQuestions({ params: { subtopicKey: 'react-js-jsx' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.questions, questions);
});

test('quiz endpoints return 404 when the subtopic key does not exist', async () => {
  const controller = makeController({ Subtopics: { findOne: async () => null } });
  const res = response();

  await controller.getQuestions({ params: { subtopicKey: 'missing-subtopic' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'Subtopic not found.');
});

test('subtopic question endpoint hides questions with multiple correct options', async () => {
  const controller = makeController({
    QuizQuestions: {
      findAll: async () => [
        { id: 'single', answer: { correct_options: ['A'] }, question: 'Single answer' },
        { id: 'multiple', answer: { correct_options: ['A', 'B'] }, question: 'Multiple answers' },
      ],
    },
  });
  const res = response();

  await controller.getQuestions({ params: { subtopicKey: 'react-js-jsx' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.questions.map((question) => question.id), ['single']);
  assert.equal('answer' in res.body.questions[0], false);
});

test('quiz course catalog returns active courses with nested topics and subtopics', async () => {
  let query;
  const controller = makeController({
    Courses: {
      findAll: async (options) => {
        query = options;
        return [{
          id: 2,
          courseName: 'React',
          Topics: [{
            id: 10,
            title: 'JSX',
            displayOrder: 1,
            Subtopics: [{ id: 100, title: 'Understanding JSX', subtopicKey: 'react-js-jsx' }],
          }],
        }];
      },
    },
  });
  const res = response();

  await controller.getCourseCatalog({}, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(query.where, { isActive: true });
  assert.deepEqual(res.body.courses[0].topics[0].subtopics[0].subtopicKey, 'react-js-jsx');
});

test('student quiz course catalog contains only courses with active enrollments', async () => {
  let query;
  let enrollmentQuery;
  const controller = makeController({
    CourseEnrollments: {
      findAll: async (options) => {
        enrollmentQuery = options;
        return [{ courseId: 2 }, { courseId: 2 }];
      },
    },
    Courses: {
      findAll: async (options) => {
        query = options;
        return [];
      },
    },
  });
  const res = response();

  await controller.getCourseCatalog({ user: { id: 42, role: 'student' } }, res);

  assert.deepEqual(enrollmentQuery.where, { userId: 42, isActive: true });
  assert.deepEqual(query.where.isActive, true);
  assert.deepEqual(query.where.id[Op.in], [2]);
  assert.deepEqual(res.body.courses, []);
});

test('student quiz start rejects courses without an active enrollment', async () => {
  const controller = makeController({
    Courses: { findByPk: async (id) => ({ id }) },
    CourseEnrollments: { findOne: async () => null },
  });
  const res = response();

  await controller.startQuiz({
    user: { id: 42, role: 'student' },
    body: { courseId: 2 },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'You must be enrolled in this course to take its quiz.');
});

test('quiz start returns at most ten MCQs for the selected course and topic without answer keys', async () => {
  let query;
  const questions = [{ id: 'q1', question: 'JSX question', content: { options: [] }, answer: { correct_options: ['A'] } }];
  const controller = makeController({
    Courses: { findByPk: async (id) => ({ id }) },
    CourseTopics: { findOne: async () => ({ id: 10, courseId: 2 }) },
    Subtopics: {
      findAll: async () => [{ subtopicKey: 'react-js-jsx', topicId: 10 }],
    },
    QuizQuestions: {
      findAll: async (options) => {
        query = options;
        return questions;
      },
    },
  });
  const res = response();

  await controller.startQuiz({ body: { courseId: 2, topicId: 10, limit: 20 } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(query.where.type, 'MCQ');
  assert.deepEqual(query.where.subtopicKey[Op.in], ['react-js-jsx']);
  assert.equal(query.attributes.includes('answer'), true);
  assert.equal(query.attributes.includes('explanation'), false);
  assert.equal(query.attributes.includes('points'), false);
  assert.equal(res.body.limit, 10);
  assert.deepEqual(res.body.questions, [{
    id: 'q1',
    questionKey: undefined,
    subtopicKey: undefined,
    type: undefined,
    question: 'JSX question',
    difficulty: undefined,
    timeLimitSeconds: undefined,
    content: { options: [] },
    displayOrder: undefined,
  }]);
  assert.equal('answer' in res.body.questions[0], false);
});

test('quiz start randomly selects questions across all subtopics in the selected topic', async () => {
  let query;
  const questions = Array.from({ length: 12 }, (_, index) => ({
    id: `q${index + 1}`,
    question: `Question ${index + 1}`,
    subtopicKey: index < 6 ? 'subtopic-a' : 'subtopic-b',
    displayOrder: index + 1,
    answer: { correct_options: ['A'] },
  }));
  const controller = makeController({
    Courses: { findByPk: async (id) => ({ id }) },
    CourseTopics: { findOne: async () => ({ id: 10, courseId: 2 }) },
    Subtopics: {
      findAll: async (options) => {
        assert.deepEqual(options.where.topicId[Op.in], [10]);
        return [{ subtopicKey: 'subtopic-a' }, { subtopicKey: 'subtopic-b' }];
      },
    },
    QuizQuestions: {
      findAll: async (options) => {
        query = options;
        return questions;
      },
    },
  });
  const res = response();
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await controller.startQuiz({ body: { courseId: 2, topicId: 10 } }, res);
  } finally {
    Math.random = originalRandom;
  }

  assert.deepEqual(query.where.subtopicKey[Op.in], ['subtopic-a', 'subtopic-b']);
  assert.equal(res.body.questions.length, 10);
  assert.equal(res.body.questions[0].id, 'q2');
  assert.equal(res.body.questions.some((question) => question.id === 'q11'), true);
  assert.deepEqual(new Set(res.body.questions.map((question) => question.subtopicKey)), new Set(['subtopic-a', 'subtopic-b']));
});

test('quiz start filters questions by selected difficulty', async () => {
  let query;
  const controller = makeController({
    Courses: { findByPk: async (id) => ({ id }) },
    CourseTopics: { findOne: async () => ({ id: 10, courseId: 2 }) },
    Subtopics: { findAll: async () => [{ subtopicKey: 'react-js-jsx', topicId: 10 }] },
    QuizQuestions: {
      findAll: async (options) => {
        query = options;
        return [{ id: 'hard', question: 'Hard question', difficulty: 'HARD', answer: { correct_options: ['A'] } }];
      },
    },
  });
  const res = response();

  await controller.startQuiz({ body: { courseId: 2, topicId: 10, difficulty: 'HARD' } }, res);

  assert.equal(query.where.difficulty, 'HARD');
  assert.deepEqual(res.body.questions.map((question) => question.id), ['hard']);
});

test('quiz start rejects unsupported difficulty values', async () => {
  const controller = makeController();
  const res = response();

  await controller.startQuiz({ body: { courseId: 2, difficulty: 'IMPOSSIBLE' } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /difficulty must be/);
});

test('quiz start excludes questions with multiple correct options', async () => {
  const controller = makeController({
    Courses: { findByPk: async (id) => ({ id }) },
    CourseTopics: { findOne: async () => ({ id: 10, courseId: 2 }) },
    Subtopics: { findAll: async () => [{ subtopicKey: 'react-js-jsx', topicId: 10 }] },
    QuizQuestions: {
      findAll: async () => [
        { id: 'single', answer: { correct_options: ['A'] }, question: 'Single answer' },
        { id: 'multiple', answer: { correct_options: ['A', 'B'] }, question: 'Multiple answers' },
      ],
    },
  });
  const res = response();

  await controller.startQuiz({ body: { courseId: 2, topicId: 10 } }, res);

  assert.deepEqual(res.body.questions.map((question) => question.id), ['single']);
});

test('quiz submission scores each question equally and returns missed-answer explanations', async () => {
  let query;
  const controller = makeController({
    Courses: { findByPk: async (id) => ({ id }) },
    CourseTopics: { findOne: async () => ({ id: 10, courseId: 2 }) },
    Subtopics: { findAll: async () => [{ subtopicKey: 'react-js-jsx', topicId: 10 }] },
    QuizQuestions: {
      findAll: async (options) => {
        query = options;
        return [
          {
            id: '11111111-1111-4111-8111-111111111111',
            question: 'Which option is correct?',
            content: { options: [{ id: 'A', text: 'First' }, { id: 'B', text: 'Second' }] },
            answer: { correct_options: ['A'] },
            explanation: 'Option A is correct.',
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            question: 'Which JSX syntax is valid?',
            content: { options: [{ id: 'A', text: 'Braces' }, { id: 'B', text: 'Brackets' }] },
            answer: { correct_options: ['A'] },
            explanation: 'Curly braces embed expressions.',
          },
        ];
      },
    },
  });
  const res = response();

  await controller.submitQuiz({
    body: {
      courseId: 2,
      topicId: 10,
      answers: [
        { questionId: '11111111-1111-4111-8111-111111111111', selectedOptions: ['A'] },
        { questionId: '22222222-2222-4222-8222-222222222222', selectedOptions: ['B'] },
      ],
    },
  }, res);

  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.deepEqual(query.where.id[Op.in], ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']);
  assert.deepEqual(res.body.score, {
    correctCount: 1,
    questionCount: 2,
    percentage: 50,
  });

  assert.deepEqual(res.body.incorrectQuestions, [{
    questionId: '22222222-2222-4222-8222-222222222222',
    question: 'Which JSX syntax is valid?',
    selectedAnswers: ['Brackets'],
    correctAnswers: ['Braces'],
    explanation: 'Curly braces embed expressions.',
  }]);
});

test('quiz submission rejects multiple selected options', async () => {
  const controller = makeController({
    Courses: { findByPk: async (id) => ({ id }) },
  });
  const res = response();

  await controller.submitQuiz({
    body: {
      courseId: 2,
      answers: [{
        questionId: '11111111-1111-4111-8111-111111111111',
        selectedOptions: ['A', 'B'],
      }],
    },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /at most one selected option/);
});
