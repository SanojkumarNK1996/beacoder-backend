const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { Sequelize, DataTypes, Op } = require('sequelize');

// All application dependencies are explicitly injected; config and .env are never loaded.
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

const enrollmentFixture = () => {
  const connection = new Sequelize({ dialect: 'postgres', logging: false });
  connection.query = async () => { throw new Error('Database access forbidden in offline tests'); };
  const courses = new Map();
  const existing = new Map();
  const lookups = [];
  const writes = [];
  const Courses = {
    async findByPk(id, options) {
      lookups.push({ id, options });
      return courses.get(id);
    },
  };
  const Enrollments = load('models/CourseEnrollments.model.js', {
    sequelize: { DataTypes },
    '../config/db': { pgConn: connection },
    './Courses.model': Courses,
  });
  Enrollments.rawAttributes.courseId = { type: DataTypes.INTEGER };
  Enrollments.refreshAttributes();
  Enrollments.findByPk = async (id) => existing.get(id);
  Enrollments.findAll = async () => [...existing.values()];
  const queryInterface = connection.getQueryInterface();
  queryInterface.insert = async (instance, table, values) => {
    writes.push(values);
    return [instance, 1];
  };
  queryInterface.bulkInsert = async (table, values) => {
    writes.push(values);
    return values;
  };
  queryInterface.upsert = async (table, insert, update) => {
    writes.push({ insert, update });
    return [insert, true];
  };
  queryInterface.bulkUpdate = async (table, values) => {
    writes.push(values);
    return 1;
  };
  return { Enrollments, Courses, courses, existing, lookups, writes };
};

const userController = (Courses, Enrollments) => load('controllers/user.controller.js', {
  '../models/CourseEnrollments.model.js': Enrollments,
  '../models/Courses.model': Courses,
  '../models/Subtopics.model': {},
  '../models/CourseTopics.model': {},
  '../models/UserSubtopicReview.model': {},
  '../config/db': {},
});

const courseController = (Courses, Enrollments = {}) => load('controllers/course.controller.js', {
  '../models/CourseEnrollments.model': Enrollments,
  '../models/Courses.model': Courses,
  sequelize: { Op },
});

test('courses default to inactive and reject null activation', () => {
  const connection = new Sequelize({ dialect: 'postgres', logging: false });
  connection.query = async () => { throw new Error('Database access forbidden'); };
  const Courses = load('models/Courses.model.js', {
    sequelize: { DataTypes },
    '../config/db': { pgConn: connection },
  });
  assert.equal(Courses.build({ courseKey: 'test', courseName: 'Test' }).isActive, false);
  assert.equal(Courses.rawAttributes.isActive.allowNull, false);
});

test('direct API enrollment fails closed before checking or writing enrollments', async () => {
  for (const isActive of [false, undefined, null, 'false', 'true', 0, 1]) {
    const controller = userController({ findByPk: async () => ({ isActive }) }, {
      findOne: async () => assert.fail('Enrollment lookup should not occur'),
      create: async () => assert.fail('Enrollment write should not occur'),
    });
    const res = response();
    await controller.enrollInCourse({ params: { courseId: 1 }, user: { id: 2 } }, res);
    assert.equal(res.statusCode, 403);
  }
});

test('active direct API enrollment, duplicates, and missing courses keep their statuses', async () => {
  for (const [course, existing, expected] of [
    [{ isActive: true }, null, 201],
    [{ isActive: true }, { id: 3 }, 400],
    [null, null, 404],
  ]) {
    let writes = 0;
    const controller = userController({ findByPk: async () => course }, {
      findOne: async () => existing,
      create: async (values) => { writes++; return values; },
    });
    const res = response();
    await controller.enrollInCourse({ params: { courseId: 1 }, user: { id: 2 } }, res);
    assert.equal(res.statusCode, expected);
    assert.equal(writes, expected === 201 ? 1 : 0);
  }
});

test('model creation and bulk creation block inactive, missing, and nonboolean course activation', async () => {
  for (const course of [{ isActive: false }, {}, { isActive: null }, { isActive: 'true' }, undefined]) {
    const fixture = enrollmentFixture();
    fixture.courses.set(1, { isActive: true });
    fixture.courses.set(2, course);
    await assert.rejects(fixture.Enrollments.create({ courseId: 2 }), { statusCode: 403 });
    await assert.rejects(fixture.Enrollments.bulkCreate([{ courseId: 1 }, { courseId: 2 }]), { statusCode: 403 });
    assert.equal(fixture.writes.length, 0);
  }
});

test('active creation and bulk creation work and forward the transaction', async () => {
  const fixture = enrollmentFixture();
  fixture.courses.set(1, { isActive: true });
  const transaction = { id: 'offline-transaction' };
  await fixture.Enrollments.create({ courseId: 1 }, { transaction });
  await fixture.Enrollments.bulkCreate([{ courseId: 1 }, { courseId: 1 }], { transaction });
  assert.equal(fixture.writes.length, 2);
  assert.ok(fixture.lookups.every((lookup) => lookup.options.transaction.id === transaction.id));
});

test('upserts cannot create inactive enrollments or reactivate inactive conflict rows', async () => {
  const fixture = enrollmentFixture();
  fixture.courses.set(1, { isActive: true });
  fixture.courses.set(2, { isActive: false });
  fixture.existing.set(7, { id: 7, courseId: 2, isActive: false });
  await assert.rejects(fixture.Enrollments.upsert({ courseId: 2 }), { statusCode: 403 });
  await assert.rejects(fixture.Enrollments.upsert(
    { id: 7, courseId: 1, isActive: true }, { fields: ['isActive'] }
  ), { statusCode: 403 });
  await assert.rejects(fixture.Enrollments.bulkCreate(
    [{ id: 7, courseId: 1, isActive: true }], { updateOnDuplicate: ['isActive'] }
  ), { statusCode: 403 });
  assert.equal(fixture.writes.length, 0);
});

test('partial progress/deactivation upserts and active reassignment remain available', async () => {
  const fixture = enrollmentFixture();
  fixture.courses.set(1, { isActive: true });
  fixture.courses.set(2, { isActive: false });
  fixture.existing.set(7, { id: 7, courseId: 2, isActive: false });
  await fixture.Enrollments.upsert({ id: 7, completionPercentage: 50 });
  await fixture.Enrollments.upsert({ id: 7, isActive: false });
  await fixture.Enrollments.upsert({ id: 7, courseId: 1, isActive: true });
  assert.equal(fixture.writes.length, 3);
  assert.equal(fixture.lookups.length, 1);
  assert.equal(fixture.lookups[0].id, 1);
});

test('bulk updates block reactivation and reassignment but allow progress and deactivation', async () => {
  const fixture = enrollmentFixture();
  fixture.courses.set(2, { isActive: false });
  fixture.existing.set(7, { id: 7, courseId: 2 });
  await assert.rejects(fixture.Enrollments.update({ isActive: true }, { where: { id: 7 } }), { statusCode: 403 });
  await assert.rejects(fixture.Enrollments.update({ courseId: 2 }, { where: { id: 7 } }), { statusCode: 403 });
  await assert.rejects(fixture.Enrollments.update(
    { isActive: 'true' }, { where: { id: 7 }, validate: false }
  ), { statusCode: 400 });
  assert.equal(fixture.writes.length, 0);
  await fixture.Enrollments.update({ completionPercentage: 50 }, { where: { id: 7 } });
  await fixture.Enrollments.update({ isActive: false }, { where: { id: 7 } });
  assert.equal(fixture.writes.length, 2);
});

test('instance update hooks block inactive reactivation and reassignment', async () => {
  const fixture = enrollmentFixture();
  fixture.courses.set(2, { isActive: false });
  const instance = fixture.Enrollments.build({ id: 7, courseId: 2, isActive: false }, { isNewRecord: false });
  for (const field of instance.changed() || []) instance.changed(field, false);
  instance.isActive = true;
  await assert.rejects(fixture.Enrollments.runHooks('beforeUpdate', instance, {}), { statusCode: 403 });
  for (const field of instance.changed() || []) instance.changed(field, false);
  instance.courseId = 3;
  await assert.rejects(fixture.Enrollments.runHooks('beforeUpdate', instance, {}), { statusCode: 403 });
  for (const field of instance.changed() || []) instance.changed(field, false);
  instance.completionPercentage = 50;
  await fixture.Enrollments.runHooks('beforeUpdate', instance, {});
});

test('direct API propagates a model rejection if a course becomes inactive after lookup', async () => {
  const controller = userController({ findByPk: async () => ({ isActive: true }) }, {
    findOne: async () => null,
    create: async () => { throw Object.assign(new Error('Inactive'), { statusCode: 403 }); },
  });
  const res = response();
  await controller.enrollInCourse({ params: { courseId: 1 }, user: { id: 2 } }, res);
  assert.equal(res.statusCode, 403);
});

test('course writes accept actual booleans, default false, and reject nonbooleans', async () => {
  const writes = [];
  const controller = courseController({
    create: async (values) => { writes.push(values); return values; },
    update: async (values) => { writes.push(values); return [1]; },
    findByPk: async () => writes.at(-1),
  });
  for (const isActive of [undefined, false, true]) {
    const res = response();
    await controller.createCourse({ body: { courseKey: 'test', courseName: 'Test', isActive } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.isActive, isActive === true);
  }
  for (const isActive of ['false', 'true', null, 1]) {
    for (const handler of ['createCourse', 'updateCourse']) {
      const res = response();
      await controller[handler]({ body: { isActive }, params: { courseId: 1 } }, res);
      assert.equal(res.statusCode, 400);
    }
  }
  assert.equal(writes.length, 3);
  const res = response();
  await controller.updateCourse({ body: { isActive: false }, params: { courseId: 1 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isActive, false);
});

test('catalogue, detail, and enrolled responses preserve inactive visibility and activation state', async () => {
  const inactive = { id: 2, isActive: false };
  const controller = courseController({
    findAll: async (options) => {
      assert.equal(options.where.isActive, undefined);
      return [inactive];
    },
    findByPk: async () => inactive,
  }, { findAll: async () => [] });
  for (const handler of ['getAllCourses', 'getCourseById']) {
    const res = response();
    await controller[handler]({ user: { id: 1 }, params: { courseId: 2 } }, res);
    const data = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
    assert.equal(data.isActive, false);
  }
  const users = userController({}, { findAll: async (options) => {
    assert.ok(options.include[0].attributes.includes('isActive'));
    return [{ Course: inactive, completionPercentage: 25 }];
  } });
  const res = response();
  await users.getUserCourses({ user: { id: 1 } }, res);
  assert.equal(res.body.data[0].isActive, false);
});

test('roadmap and curriculum preserve locked courses; stream and search filter active courses', async () => {
  const controller = load('controllers/curriculum.controller.js', {
    sequelize: { Op },
    '../models': {},
    '../models/Courses.model': { findAll: async (options) => {
      assert.equal(options.where.isActive, true);
      return [];
    } },
    '../models/CourseTopics.model': {},
    '../models/Subtopics.model': {},
    '../models/CareerRoadmapCourses.model': { findAll: async (options) => {
      assert.equal(options.where.isActive, true);
      assert.equal(options.include[0].where, undefined);
      assert.equal(options.include[0].required, true);
      return [{ careerDomain: 'Tech', jobReadyProgram: 'Developer', displayOrder: 1,
        Course: { id: 1, isActive: false, Topics: [] } }];
    } },
  });
  for (const handler of ['getRoadmap', 'getCurriculum', 'getStream', 'searchCurriculum']) {
    const res = response();
    await controller[handler]({ params: { stream: 'Web' }, query: { q: 'Test' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    if (handler === 'getRoadmap') assert.equal(res.body.data[0].programs[0].courses[0].isActive, false);
    if (handler === 'getCurriculum') assert.equal(res.body.data.careerDomains[0].programs[0].courses[0].isActive, false);
  }
});
