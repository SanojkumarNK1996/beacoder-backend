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

const question = (overrides = {}) => ({
  questionKey: 'q-1', subtopicKey: 'react-jsx', question: 'Which option is correct?',
  type: 'MCQ', difficulty: 'EASY', timeLimitSeconds: 30,
  content: { options: [{ id: 'A', text: 'Correct' }, { id: 'B', text: 'Wrong' }] },
  answer: { correct_options: ['A'] }, explanation: 'Option A is correct.',
  ...overrides,
});

const makeController = (overrides = {}) => load('controllers/questionnaire.controller.js', {
  sequelize: { Op },
  '../models/Tests.model': { findAll: async () => [], findByPk: async () => null, findOne: async () => null, ...overrides.Tests },
  '../models/UserTestResults.model': { findAll: async () => [], findOne: async () => null, findOrCreate: async () => [{ status: 'NEW' }, true], ...overrides.UserTestResults },
  '../models/Users.model': { findAll: async () => [], ...overrides.Users },
  '../models/StudentActivity.model': { create: async () => ({}), ...overrides.StudentActivity },
  '../models/QuizQuestion.model': { findAll: async () => [], ...overrides.QuizQuestions },
  '../models/Subtopics.model': { findAll: async () => [], ...overrides.Subtopics },
  '../models/CourseTopics.model': { findAll: async () => [], ...overrides.CourseTopics },
  '../models/Courses.model': { findAll: async () => [], ...overrides.Courses },
  '../config/db': { pgConn: { transaction: async () => ({ LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {}, finished: false }) } },
});

test('questionnaire model enforces a unique learner/test assignment and stores no answers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'models', 'UserTestResults.model.js'), 'utf8');
  assert.match(source, /indexes:\s*\[\{\s*unique:\s*true,\s*fields:\s*\['userId',\s*'testId'\]/);
  assert.doesNotMatch(source, /responses|answers|selectedOptions/i);
});

test('questionnaire results can be filtered by student name or email', async () => {
  let userWhere;
  let resultWhere;
  const controller = makeController({
    Tests: { findAll: async () => [{ id: 7 }] },
    Users: { findAll: async (options) => { userWhere = options.where; return [{ id: 10 }]; } },
    UserTestResults: { findAll: async (options) => { resultWhere = options.where; return [{ id: 99 }]; } },
  });
  const res = response();

  await controller.searchResults({ query: { search: 'React', studentSearch: 'Ava' }, user: { id: 3, role: 'instructor' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, [{ id: 99 }]);
  assert.equal(userWhere[Op.or][0].name[Op.iLike], '%Ava%');
  assert.equal(userWhere[Op.or][1].email[Op.iLike], '%Ava%');
  assert.deepEqual(resultWhere.testId[Op.in], [7]);
  assert.deepEqual(resultWhere.userId[Op.in], [10]);
});

test('instructor retake reset clears completed score fields transactionally', async () => {
  let saved;
  let transactionUsed;
  let committed = false;
  const transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => { committed = true; }, rollback: async () => {}, finished: false };
  const result = {
    status: 'COMPLETED',
    update: async (values, options) => { saved = values; transactionUsed = options.transaction; },
  };
  const loaded = load('controllers/questionnaire.controller.js', {
    sequelize: { Op },
    '../models/Tests.model': { findAll: async () => [], findByPk: async () => ({ id: 7, createdBy: 3, isActive: true }) },
    '../models/UserTestResults.model': { findOne: async (options) => { assert.deepEqual(options.where, { testId: 7, userId: 10 }); assert.equal(options.transaction, transaction); assert.equal(options.lock, 'UPDATE'); return result; } },
    '../models/Users.model': {},
    '../models/StudentActivity.model': {},
    '../models/QuizQuestion.model': {},
    '../models/Subtopics.model': {},
    '../models/CourseTopics.model': {},
    '../models/Courses.model': {},
    '../config/db': { pgConn: { transaction: async () => transaction } },
  });
  const res = response();

  await loaded.allowRetake({ params: { testId: '7', userId: '10' }, user: { id: 3, role: 'instructor' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(saved, { status: 'NEW', earnedMarks: null, totalMarks: null, courseMarks: null, topicMarks: null, completedAt: null });
  assert.equal(transactionUsed, transaction);
  assert.equal(committed, true);
});

test('retake reset rejects a result that is not completed', async () => {
  let rolledBack = false;
  const transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => { rolledBack = true; }, finished: false };
  const loaded = load('controllers/questionnaire.controller.js', {
    sequelize: { Op },
    '../models/Tests.model': { findByPk: async () => ({ id: 7, createdBy: 3, isActive: true }) },
    '../models/UserTestResults.model': { findOne: async () => ({ status: 'NEW', update: async () => assert.fail('Should not reset an incomplete attempt') }) },
    '../models/Users.model': {},
    '../models/StudentActivity.model': {},
    '../models/QuizQuestion.model': {},
    '../models/Subtopics.model': {},
    '../models/CourseTopics.model': {},
    '../models/Courses.model': {},
    '../config/db': { pgConn: { transaction: async () => transaction } },
  });
  const res = response();

  await loaded.allowRetake({ params: { testId: '7', userId: '10' }, user: { id: 3, role: 'instructor' } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(rolledBack, true);
});

test('student start returns question content but never answer keys or explanations', async () => {
  const testRecord = { id: 7, testName: 'React basics', questionKeys: ['q-1'], isActive: true };
  const controller = makeController({
    UserTestResults: { findOne: async () => ({ status: 'NEW' }) },
    Tests: { findOne: async () => testRecord },
    QuizQuestions: { findAll: async () => [question()] },
  });
  const res = response();

  await controller.startTest({ params: { testId: '7' }, user: { id: 10 } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.questions[0].content, question().content);
  assert.equal('answer' in res.body.questions[0], false);
  assert.equal('explanation' in res.body.questions[0], false);
  assert.equal('points' in res.body.questions[0], false);
});

test('test submission grades transient answers and stores aggregate marks only', async () => {
  let saved;
  let createdActivity;
  let committed = false;
  const result = {
    status: 'NEW',
    update: async (values) => { saved = values; Object.assign(result, values); },
  };
  const transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => { committed = true; }, rollback: async () => {}, finished: false };
  const controller = makeController({
    UserTestResults: { findOne: async () => result },
    Tests: { findByPk: async () => ({ testName: 'React basics', questionKeys: ['q-1'] }) },
    StudentActivity: { create: async (values, options) => { createdActivity = { values, options }; } },
    QuizQuestions: { findAll: async () => [question()] },
    Subtopics: { findAll: async () => [{ subtopicKey: 'react-jsx', title: 'JSX', topicId: 4 }] },
    CourseTopics: { findAll: async () => [{ id: 4, title: 'React', courseId: 2 }] },
    Courses: { findAll: async () => [{ id: 2, courseName: 'React course' }] },
  });
  controller.__transaction = transaction;
  const loaded = load('controllers/questionnaire.controller.js', {
    sequelize: { Op },
    '../models/Tests.model': { findAll: async () => [], findByPk: async () => ({ testName: 'React basics', questionKeys: ['q-1'] }), findOne: async () => null },
    '../models/UserTestResults.model': { findAll: async () => [], findOne: async () => result },
    '../models/Users.model': { findAll: async () => [] },
    '../models/StudentActivity.model': { create: async (values, options) => { createdActivity = { values, options }; } },
    '../models/QuizQuestion.model': { findAll: async () => [question()] },
    '../models/Subtopics.model': { findAll: async () => [{ subtopicKey: 'react-jsx', title: 'JSX', topicId: 4 }] },
    '../models/CourseTopics.model': { findAll: async () => [{ id: 4, title: 'React', courseId: 2 }] },
    '../models/Courses.model': { findAll: async () => [{ id: 2, courseName: 'React course' }] },
    '../config/db': { pgConn: { transaction: async () => transaction } },
  });
  const res = response();

  await loaded.submitTest({ params: { testId: '7' }, user: { id: 10 }, body: { answers: [{ questionKey: 'q-1', selectedOptions: ['A'] }] } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(committed, true);
  assert.equal(saved.status, 'COMPLETED');
  assert.equal(saved.earnedMarks, 1);
  assert.equal(saved.totalMarks, 1);
  assert.equal(saved.courseMarks[0].topics[0].earnedMarks, 1);
  assert.equal(createdActivity.values.studentId, 10);
  assert.equal(createdActivity.values.recordedById, 10);
  assert.equal(createdActivity.values.title, 'Completed assigned questionnaire');
  assert.equal(createdActivity.values.details, 'React basics — Score: 1/1 (100%).');
  assert.equal(createdActivity.options.transaction, transaction);
  assert.equal('answers' in saved, false);
  assert.equal('selectedOptions' in saved, false);
  assert.equal('topicMarks' in saved, true);
});

test('submissions reject unknown keys and do not persist a second attempt', async () => {
  let updateCalled = false;
  let rolledBack = false;
  const transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => { rolledBack = true; }, finished: false };
  const result = { status: 'NEW', update: async () => { updateCalled = true; } };
  const controller = load('controllers/questionnaire.controller.js', {
    sequelize: { Op },
    '../models/Tests.model': { findByPk: async () => ({ questionKeys: ['q-1'] }) },
    '../models/UserTestResults.model': { findOne: async () => result },
    '../models/Users.model': {},
    '../models/StudentActivity.model': { create: async () => {} },
    '../models/QuizQuestion.model': {},
    '../models/Subtopics.model': {},
    '../models/CourseTopics.model': {},
    '../models/Courses.model': {},
    '../config/db': { pgConn: { transaction: async () => transaction } },
  });
  const res = response();

  await controller.submitTest({ params: { testId: '7' }, user: { id: 10 }, body: { answers: [{ questionKey: 'q-other', selectedOptions: ['A'] }] } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(updateCalled, false);
  assert.equal(rolledBack, true);
});