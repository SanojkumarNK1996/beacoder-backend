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

const fixture = () => {
  const created = [];
  const queries = [];
  const recorder = { id: 4, name: 'Tutor Name' };
  const saved = {
    id: 21,
    studentId: 9,
    recordedById: recorder.id,
    activityDate: '2026-10-10',
    title: 'Completed arrays',
    details: 'Practiced loops and arrays.',
    recorder,
  };
  const Users = {
    async findOne({ where }) { return where.id === 9 && where.role === 'student' ? { id: 9 } : null; },
  };
  const StudentActivity = {
    async create(values) { created.push(values); return { id: saved.id }; },
    async findByPk() { return saved; },
    async findAll(options) { queries.push(options); return [saved]; },
  };
  const controller = load('controllers/progress.controller.js', {
    '../models/StudentProgress.model': {},
    '../models/CourseEnrollments.model': {},
    '../models/Users.model': Users,
    '../models/UserAssignments.model': {},
    '../models/StudentActivity.model': StudentActivity,
    sequelize: { Op: { iLike: Symbol('iLike') } },
  });
  return { controller, created, saved, queries };
};

test('tutor activity is saved with student, authenticated recorder, and selected activity date', async () => {
  const { controller, created, saved } = fixture();
  const res = response();

  await controller.createStudentActivity({
    params: { studentId: '9' },
    user: { id: 4 },
    body: { activityDate: '2026-10-10', title: '  Completed arrays  ', details: ' Practiced loops and arrays. ' },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(created[0], {
    studentId: 9,
    recordedById: 4,
    activityDate: '2026-10-10',
    title: 'Completed arrays',
    details: 'Practiced loops and arrays.',
  });
  assert.equal(res.body.data.recorder.name, 'Tutor Name');
  assert.equal(res.body.data.id, saved.id);
});

test('activity creation rejects invalid dates and blank titles', async () => {
  const { controller, created } = fixture();
  const invalidDate = response();
  await controller.createStudentActivity({
    params: { studentId: '9' }, user: { id: 4 },
    body: { activityDate: '2026-02-30', title: 'Activity' },
  }, invalidDate);
  assert.equal(invalidDate.statusCode, 400);

  const blankTitle = response();
  await controller.createStudentActivity({
    params: { studentId: '9' }, user: { id: 4 },
    body: { activityDate: '2026-10-10', title: '   ' },
  }, blankTitle);
  assert.equal(blankTitle.statusCode, 400);
  assert.equal(created.length, 0);
});

test('activity timeline returns 404 for an ID that is not a student', async () => {
  const { controller } = fixture();
  const res = response();

  await controller.getStudentActivities({ params: { studentId: '123' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});

test('student timeline is scoped to the authenticated student account', async () => {
  const { controller, queries, saved } = fixture();
  const res = response();

  await controller.getMyStudentActivities({ user: { id: 9, role: 'student' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(queries[0].where, { studentId: 9 });
  assert.equal(res.body.data[0].id, saved.id);
});

test('student timeline rejects non-student roles', async () => {
  const { controller, queries } = fixture();
  const res = response();

  await controller.getMyStudentActivities({ user: { id: 4, role: 'instructor' } }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(queries.length, 0);
});
