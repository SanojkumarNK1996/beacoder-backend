const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

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

const controllerFixture = ({ enrolled = true, total = 4, reviewed = 1, existing = null } = {}) => {
  const counts = [];
  const upserts = [];
  const updates = [];
  const transactions = [];
  let savedReview = existing;
  const subtopic = { id: 9, isActive: true, CourseTopic: { courseId: 3 } };
  const enrollment = {
    completionPercentage: 25,
    async update(values, options) { updates.push({ values, options }); },
  };
  const Subtopics = {
    async findByPk(id, options) { return id === '9' || id === 9 ? subtopic : null; },
    async count(options) { counts.push(options); return total; },
  };
  const CourseEnrollments = {
    async findOne(options) {
      if (options.lock) assert.equal(options.lock, 'UPDATE');
      return enrolled ? enrollment : null;
    },
  };
  const UserSubtopicReview = {
    async upsert(values, options) {
      upserts.push({ values, options });
      savedReview = { ...values };
    },
    async count(options) { counts.push(options); return reviewed; },
    async findOne() { return savedReview; },
  };
  const db = {
    pgConn: {
      async transaction() {
        const transaction = {
          LOCK: { UPDATE: 'UPDATE' },
          finished: false,
          async commit() { this.finished = 'commit'; },
          async rollback() { this.finished = 'rollback'; },
        };
        transactions.push(transaction);
        return transaction;
      },
    },
  };
  const controller = load('controllers/user.controller.js', {
    '../models/CourseEnrollments.model.js': CourseEnrollments,
    '../models/Courses.model': {},
    '../models/Subtopics.model': Subtopics,
    '../models/CourseTopics.model': {},
    '../models/UserSubtopicReview.model': UserSubtopicReview,
    '../config/db': db,
  });
  return { controller, counts, upserts, updates, transactions, enrollment };
};

test('saving a subtopic review updates the unique selection and stores reviewed coverage', async () => {
  const fixture = controllerFixture({ total: 4, reviewed: 2, existing: { selection: 'NEEDS_MORE' } });
  const res = response();

  await fixture.controller.saveSubtopicReview({
    params: { subtopicId: '9' },
    body: { selection: 'UNDERSTOOD' },
    user: { id: 7 },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(fixture.upserts[0].values, { userId: 7, subtopicId: 9, selection: 'UNDERSTOOD' });
  assert.equal(res.body.data.selection, 'UNDERSTOOD');
  assert.equal(res.body.data.completionPercentage, 50);
  assert.equal(fixture.updates[0].values.completionPercentage, 50);
  assert.equal(fixture.transactions[0].finished, 'commit');
});

test('invalid selection is rejected without opening a transaction', async () => {
  const fixture = controllerFixture();
  const res = response();

  await fixture.controller.saveSubtopicReview({
    params: { subtopicId: '9' }, body: { selection: 'MAYBE' }, user: { id: 7 },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(fixture.transactions.length, 0);
  assert.equal(fixture.upserts.length, 0);
});

test('review cannot be saved by a user who is not enrolled', async () => {
  const fixture = controllerFixture({ enrolled: false });
  const res = response();

  await fixture.controller.saveSubtopicReview({
    params: { subtopicId: '9' }, body: { selection: 'NOT_GOOD' }, user: { id: 7 },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(fixture.transactions[0].finished, 'rollback');
  assert.equal(fixture.upserts.length, 0);
});

test('reading a subtopic review returns the saved selection for the authenticated learner', async () => {
  const fixture = controllerFixture({ existing: { selection: 'NOT_GOOD' } });
  const res = response();

  await fixture.controller.getSubtopicReview({
    params: { subtopicId: '9' }, user: { id: 7 },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.selection, 'NOT_GOOD');
});