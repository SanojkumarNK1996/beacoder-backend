const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { Sequelize, DataTypes, Op } = require('sequelize');

const loadController = (dependencies) => {
  const filename = path.join(__dirname, '..', 'controllers/assignment.controller.js');
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.require = (name) => {
    if (name === 'sequelize') return { Op };
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

test('assignment routes allow admins and instructors to review submissions', () => {
  const routes = new Map();
  const router = {
    get(route, ...handlers) { routes.set(`GET ${route}`, handlers); },
    post(route, ...handlers) { routes.set(`POST ${route}`, handlers); },
    put(route, ...handlers) { routes.set(`PUT ${route}`, handlers); },
  };
  const requireAuth = () => {};
  const authorizeAnyRole = (...roles) => ({ roles });
  const controller = new Proxy({}, { get: () => () => {} });
  const filename = path.join(__dirname, '..', 'routes/assignment.routes.js');
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.require = (name) => {
    if (name === 'express') return { Router: () => router };
    if (name === '../controllers/assignment.controller') return controller;
    if (name === '../middleware/authorize') return { requireAuth, authorizeAnyRole };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  loaded._compile(fs.readFileSync(filename, 'utf8'), filename);

  for (const route of [
    'GET /available',
    'GET /eligible-users',
    'POST /assign',
    'POST /',
    'PUT /:assignmentId',
  ]) {
    const handlers = routes.get(route);
    assert.equal(handlers[0], requireAuth);
    assert.deepEqual(handlers[1].roles, ['admin', 'instructor']);
  }
  for (const route of [
    'GET /admin/submitted',
    'GET /admin/submitted/:submissionId',
    'POST /admin/submitted/:submissionId',
  ]) {
    const handlers = routes.get(route);
    assert.equal(handlers[0], requireAuth);
    assert.deepEqual(handlers[1].roles, ['admin', 'instructor']);
  }
  assert.equal(routes.get('POST /user/:userAssignmentId/start')[0], requireAuth);
  assert.equal(routes.get('POST /:userAssignmentId/submit')[0], requireAuth);
});

test('UserAssignments defines the lifecycle fields and unique user/assignment allocation', async () => {
  const connection = new Sequelize({ dialect: 'postgres', logging: false });
  const filename = path.join(__dirname, '..', 'models/UserAssignments.model.js');
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.require = (name) => {
    if (name === 'sequelize') return { DataTypes };
    if (name === '../config/db') return { pgConn: connection };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  loaded._compile(fs.readFileSync(filename, 'utf8'), filename);

  const model = loaded.exports;
  for (const field of [
    'userId', 'assignmentId', 'assignedById', 'assignedAt', 'status',
    'textAnswer', 'submissionUrl', 'startedAt', 'submittedAt',
    'completedAt', 'marksObtained', 'feedback',
  ]) {
    assert.ok(model.rawAttributes[field], `${field} should be a model attribute`);
  }
  assert.deepEqual(model.rawAttributes.status.type.values, [
    'assigned', 'in_progress', 'submitted', 'completed', 'rejected',
  ]);
  assert.ok(model.options.indexes.some((index) =>
    index.unique && index.fields.join(',') === 'userId,assignmentId'));
  await connection.close();
});

test('Assignments use only the globally unique subtopicKey curriculum foreign key', async () => {
  const connection = new Sequelize({ dialect: 'postgres', logging: false });
  const filename = path.join(__dirname, '..', 'models/Assignment.model.js');
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.require = (name) => {
    if (name === 'sequelize') return { DataTypes };
    if (name === '../config/db') return { pgConn: connection };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  loaded._compile(fs.readFileSync(filename, 'utf8'), filename);

  const model = loaded.exports;
  assert.ok(model.rawAttributes.assignmentKey);
  assert.equal(model.rawAttributes.assignmentKey.allowNull, false);
  assert.equal(model.rawAttributes.assignmentKey.unique, true);
  assert.deepEqual(model.rawAttributes.difficulty.type.values, ['easy', 'medium', 'tough']);
  assert.equal(model.rawAttributes.dueDate, undefined);
  assert.ok(model.rawAttributes.subtopicKey);
  assert.equal(model.rawAttributes.subtopicKey.allowNull, false);
  assert.equal(model.rawAttributes.subtopicKey.references.model, 'Subtopics');
  assert.equal(model.rawAttributes.subtopicKey.references.key, 'subtopicKey');
  assert.equal(model.rawAttributes.allowedSubmissionType, undefined);
  assert.equal(model.rawAttributes.maxMarks, undefined);
  for (const redundantField of ['courseId', 'topicId', 'subtopicId']) {
    assert.equal(model.rawAttributes[redundantField], undefined);
  }
  await connection.close();
});

const hierarchy = {
  Courses: { findByPk: async (id) => id === 1 ? { id: 1 } : null },
  CourseTopics: { findByPk: async (id) => id === 2 ? { id: 2, courseId: 1 } : null },
  Subtopics: {
    findByPk: async () => null,
    findOne: async ({ where }) => where.subtopicKey === 'stable-subtopic-key'
      ? { subtopicKey: 'stable-subtopic-key', topicId: 2 }
      : null,
  },
};

const dependencies = (overrides = {}) => ({
  '../models/Assignment.model': { findAll: async () => [], findByPk: async () => null },
  '../models/Courses.model': hierarchy.Courses,
  '../models/CourseTopics.model': { ...hierarchy.CourseTopics, findAll: async () => [] },
  '../models/Subtopics.model': hierarchy.Subtopics,
  '../models/CourseEnrollments.model': { findAll: async () => [] },
  '../models/Users.model': {},
  '../models/UserAssignments.model': {
    findAll: async () => [],
    findByPk: async () => null,
    bulkCreate: async () => [],
    count: async () => 0,
  },
  ...overrides,
});

test('assignment allocation creates only eligible cross-product rows and ignores existing allocations', async () => {
  const created = [];
  const controller = loadController(dependencies({
    '../models/Assignment.model': {
      findAll: async () => [{ id: 10 }, { id: 11 }],
    },
    '../models/CourseEnrollments.model': {
      findAll: async () => [{ User: { id: 4 } }],
    },
    '../models/UserAssignments.model': {
      findAll: async () => [{ userId: 4, assignmentId: 10 }],
      bulkCreate: async (rows, options) => {
        assert.equal(options.ignoreDuplicates, true);
        created.push(...rows);
        return rows;
      },
    },
  }));

  const res = response();
  await controller.assignAssignments({
    body: {
      courseId: 1,
      topicId: 2,
      subtopicKey: 'stable-subtopic-key',
      assignmentIds: [10, 11, 11],
      userIds: [4, 5],
    },
    user: { id: 9 },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.createdCount, 1);
  assert.equal(res.body.ignoredUserCount, 1);
  assert.equal(res.body.duplicateCount, 3);
  assert.deepEqual(created, [{
    userId: 4,
    assignmentId: 11,
    assignedById: 9,
    assignedAt: created[0].assignedAt,
    status: 'assigned',
  }]);
});

test('assignment update edits catalogue fields and rejects curriculum key changes', async () => {
  const updatedValues = [];
  const assignment = {
    id: 12,
    async update(values) { updatedValues.push(values); Object.assign(this, values); },
  };
  const controller = loadController(dependencies({
    '../models/Assignment.model': { findByPk: async () => assignment },
  }));
  const res = response();

  await controller.updateAssignment({
    params: { assignmentId: '12' },
    body: {
      title: '  Updated assignment  ',
      description: {
        task: ' Updated task ',
        learningBenefits: ' Explain the learning value ',
        context: ' Plain-text context ',
        expectedOutput: ' Expected result ',
        instructions: ['Do not persist this'],
        language: 'javascript',
      },
      difficulty: 'medium',
      displayOrder: 2,
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(assignment.title, 'Updated assignment');
  assert.deepEqual(updatedValues[0], {
    title: 'Updated assignment',
    description: {
      task: 'Updated task',
      learningBenefits: 'Explain the learning value',
      context: 'Plain-text context',
      expectedOutput: 'Expected result',
    },
    difficulty: 'medium',
    displayOrder: 2,
  });

  const invalidRes = response();
  await controller.updateAssignment({
    params: { assignmentId: '12' },
    body: { maxMarks: 75 },
  }, invalidRes);
  assert.equal(invalidRes.statusCode, 400);
  assert.equal(updatedValues.length, 1);
});

test('assignment creation persists only retained fields and whitelisted description content', async () => {
  let createdValues;
  const controller = loadController(dependencies({
    '../models/Assignment.model': {
      findAll: async () => [{ assignmentKey: 'stable-subtopic-key_assignment_001' }],
      create: async (values) => { createdValues = values; return values; },
    },
  }));
  const res = response();

  await controller.createAssignment({
    body: {
      title: '  URL exercise  ',
      difficulty: 'easy',
      description: {
        task: ' Build the requested feature ',
        learningBenefits: ' Explain why this task matters ',
        context: ' Plain context ',
        expectedOutput: ' Expected result ',
        language: 'javascript',
        instructions: ['Not persisted'],
        starterCode: 'Not persisted',
        hint: 'Not persisted',
      },
      subtopicKey: 'stable-subtopic-key',
      displayOrder: 3,
      allowedSubmissionType: 'TEXT',
      maxMarks: 100,
      courseName: 'Do not persist',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(createdValues, {
    assignmentKey: 'stable-subtopic-key_assignment_002',
    title: 'URL exercise',
    difficulty: 'easy',
    description: {
      task: 'Build the requested feature',
      learningBenefits: 'Explain why this task matters',
      context: 'Plain context',
      expectedOutput: 'Expected result',
    },
    subtopicKey: 'stable-subtopic-key',
    displayOrder: 3,
  });
});

test('assignment creation requires every description field', async () => {
  const controller = loadController(dependencies());
  const requiredDescription = {
    task: 'Build the feature',
    learningBenefits: 'Practice reusable UI design',
    context: 'A component receives data as props',
    expectedOutput: 'A rendered greeting appears',
  };

  for (const missingField of Object.keys(requiredDescription)) {
    const body = {
      title: 'Greeting component',
      difficulty: 'easy',
      description: { ...requiredDescription },
      subtopicKey: 'stable-subtopic-key',
    };
    delete body.description[missingField];
    const res = response();
    await controller.createAssignment({ body }, res);
    assert.equal(res.statusCode, 400, `${missingField} should be required`);
    assert.match(res.body.message, new RegExp(`description\\.${missingField}`));
  }
});

test('assignment creation accepts only easy, medium, or tough difficulty', async () => {
  const controller = loadController(dependencies());
  const res = response();
  await controller.createAssignment({
    body: {
      title: 'Greeting component',
      difficulty: 'expert',
      description: {
        task: 'Build the feature',
        learningBenefits: 'Practice reusable UI design',
        context: 'A component receives data as props',
        expectedOutput: 'A rendered greeting appears',
      },
      subtopicKey: 'stable-subtopic-key',
    },
  }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /difficulty must be easy, medium, or tough/);
});

test('assignment start is owner-only and records the first start once', async () => {
  let updates = 0;
  const record = {
    id: 7,
    userId: 4,
    status: 'assigned',
    startedAt: null,
    async update(values) { updates++; Object.assign(this, values); },
  };
  const controller = loadController(dependencies({
    '../models/UserAssignments.model': { findByPk: async () => record },
  }));

  const forbidden = response();
  await controller.startAssignment({ params: { userAssignmentId: 7 }, user: { id: 5 } }, forbidden);
  assert.equal(forbidden.statusCode, 403);
  assert.equal(updates, 0);

  const started = response();
  await controller.startAssignment({ params: { userAssignmentId: 7 }, user: { id: 4 } }, started);
  assert.equal(started.statusCode, 200);
  assert.equal(record.status, 'in_progress');
  assert.ok(record.startedAt instanceof Date);

  const originalStartedAt = record.startedAt;
  const repeated = response();
  await controller.startAssignment({ params: { userAssignmentId: 7 }, user: { id: 4 } }, repeated);
  assert.equal(record.startedAt, originalStartedAt);
  assert.equal(updates, 1);
});

test('submission accepts URL-only answers, supports resubmission, and preserves reviewed completion', async () => {
  let updates = 0;
  const record = {
    id: 7,
    userId: 4,
    status: 'submitted',
    startedAt: new Date('2026-01-01T00:00:00Z'),
    async update(values) { updates++; Object.assign(this, values); },
  };
  const controller = loadController(dependencies({
    '../models/UserAssignments.model': { findByPk: async () => record },
  }));

  const protectedField = response();
  await controller.submitAssignment({
    params: { userAssignmentId: 7 },
    user: { id: 4 },
    body: { textAnswer: 'answer', status: 'completed' },
  }, protectedField);
  assert.equal(protectedField.statusCode, 400);
  assert.equal(updates, 0);

  const invalidUrl = response();
  await controller.submitAssignment({
    params: { userAssignmentId: 7 },
    user: { id: 4 },
    body: { submissionUrl: 'ftp://example.com/work' },
  }, invalidUrl);
  assert.equal(invalidUrl.statusCode, 400);
  assert.equal(updates, 0);

  const resubmitted = response();
  await controller.submitAssignment({
    params: { userAssignmentId: 7 },
    user: { id: 4 },
    body: { submissionUrl: 'https://example.com/work' },
  }, resubmitted);
  assert.equal(resubmitted.statusCode, 200);
  assert.equal(record.status, 'submitted');
  assert.equal(record.submissionUrl, 'https://example.com/work');
  assert.equal(record.startedAt.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.ok(record.submittedAt instanceof Date);

  record.status = 'completed';
  const completed = response();
  await controller.submitAssignment({
    params: { userAssignmentId: 7 },
    user: { id: 4 },
    body: { submissionUrl: 'https://example.com' },
  }, completed);
  assert.equal(completed.statusCode, 400);
  assert.equal(updates, 1);
});

test('review requires a submitted allocation, accepts uncapped nonnegative marks, and allows completed reviews to be edited', async () => {
  const record = {
    id: 7,
    status: 'submitted',
    async update(values) { Object.assign(this, values); },
  };
  const controller = loadController(dependencies({
    '../models/UserAssignments.model': { findByPk: async () => record },
  }));

  const negative = response();
  await controller.updateAssignmentStatus({
    params: { submissionId: 7 },
    body: { status: 'completed', marksObtained: -1 },
  }, negative);
  assert.equal(negative.statusCode, 400);
  assert.equal(record.status, 'submitted');

  const completed = response();
  await controller.updateAssignmentStatus({
    params: { submissionId: 7 },
    body: { status: 'completed', marksObtained: 120, feedback: 'Good work' },
  }, completed);
  assert.equal(completed.statusCode, 200);
  assert.equal(record.status, 'completed');
  assert.equal(record.marksObtained, 120);
  assert.equal(record.feedback, 'Good work');
  assert.ok(record.completedAt instanceof Date);

  const originalCompletedAt = record.completedAt;
  const updatedReview = response();
  await controller.updateAssignmentStatus({
    params: { submissionId: 7 },
    body: { status: 'completed', marksObtained: 19, feedback: 'Updated feedback' },
  }, updatedReview);
  assert.equal(updatedReview.statusCode, 200);
  assert.equal(record.status, 'completed');
  assert.equal(record.marksObtained, 19);
  assert.equal(record.feedback, 'Updated feedback');
  assert.equal(record.completedAt, originalCompletedAt);
});

test('rejecting a submission requires a non-empty comment and returns it for learner resubmission', async () => {
  const record = {
    id: 8,
    userId: 4,
    status: 'submitted',
    marksObtained: null,
    completedAt: null,
    async update(values) { Object.assign(this, values); },
  };
  const controller = loadController(dependencies({
    '../models/UserAssignments.model': { findByPk: async () => record },
  }));

  const missingComment = response();
  await controller.updateAssignmentStatus({
    params: { submissionId: 8 },
    body: { status: 'rejected', feedback: '   ' },
  }, missingComment);
  assert.equal(missingComment.statusCode, 400);
  assert.equal(record.status, 'submitted');

  const rejected = response();
  await controller.updateAssignmentStatus({
    params: { submissionId: 8 },
    body: { status: 'rejected', feedback: '  Please fix the broken link.  ' },
  }, rejected);
  assert.equal(rejected.statusCode, 200);
  assert.equal(record.status, 'rejected');
  assert.equal(record.feedback, 'Please fix the broken link.');
  assert.equal(record.marksObtained, null);
  assert.equal(record.completedAt, null);

  const resubmitted = response();
  await controller.submitAssignment({
    params: { userAssignmentId: 8 },
    user: { id: 4 },
    body: { submissionUrl: 'https://example.com/revised-work' },
  }, resubmitted);
  assert.equal(resubmitted.statusCode, 200);
  assert.equal(record.status, 'submitted');
  assert.equal(record.submissionUrl, 'https://example.com/revised-work');
  assert.equal(record.feedback, null);
});
