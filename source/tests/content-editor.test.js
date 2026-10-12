const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const sanitizeLessonHtml = require("../utils/sanitizeLessonHtml");

const load = (relativePath, dependencies) => {
  const filename = path.join(__dirname, "..", relativePath);
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.require = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  };
  loaded._compile(fs.readFileSync(filename, "utf8"), filename);
  return loaded.exports;
};

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const editorController = (overrides = {}) => load("controllers/contentEditor.controller.js", {
  "../models/Courses.model": { findAll: async () => [], findByPk: async () => ({ id: 1 }), ...overrides.Courses },
  "../models/CourseTopics.model": { findAll: async () => [], findOne: async () => ({ id: 2 }), ...overrides.CourseTopics },
  "../models/Subtopics.model": { findAll: async () => [], findOne: async () => ({ id: 3 }), ...overrides.Subtopics },
  "../models/ContentTable.model": {
    findAll: async () => [],
    findOne: async () => null,
    ...overrides.ContentBlocks,
  },
  "../utils/sanitizeLessonHtml": sanitizeLessonHtml,
});

test("content editor permits only admin and instructor roles", () => {
  const { authorizeAnyRole } = load("middleware/authorize.js", {
    jsonwebtoken: {},
    "../models/Users.model": {},
    "../config/constants": {},
  });
  for (const role of ["admin", "instructor"]) {
    let nextCalled = false;
    const res = response();
    authorizeAnyRole("admin", "instructor")(
      { user: { role } }, res, () => { nextCalled = true; }
    );
    assert.equal(nextCalled, true, role);
  }
  for (const role of ["student", "tutor"]) {
    const res = response();
    authorizeAnyRole("admin", "instructor")({ user: { role } }, res, () => {});
    assert.equal(res.statusCode, 403, role);
  }
});

test("content editor saves sanitized description without changing section metadata", async () => {
  let update;
  const block = {
    data: { description: "<p>Old</p>", other: "preserved" },
    async update(values) {
      update = values;
      this.data = values.data;
    },
  };
  const controller = editorController({
    ContentBlocks: { findOne: async () => block },
  });
  const res = response();
  await controller.updateContentBlock({
    params: { courseId: "1", topicId: "2", subtopicId: "3", contentId: "4" },
    body: { description: "<h2>Updated</h2><script>alert(1)</script><p>Text</p>" },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(update, {
    data: { description: "<h2>Updated</h2><p>Text</p>", other: "preserved" },
  });
});

test("content editor rejects attempts to change headings or block metadata", async () => {
  const controller = editorController({
    CourseTopics: { findOne: async () => assert.fail("Hierarchy must not be queried") },
  });
  const res = response();
  await controller.updateContentBlock({
    params: { courseId: "1", topicId: "2", subtopicId: "3", contentId: "4" },
    body: { title: "Changed heading", description: "<p>Text</p>" },
  }, res);
  assert.equal(res.statusCode, 400);
});

test("content editor cannot update a block outside the selected subtopic", async () => {
  const controller = editorController({
    ContentBlocks: { findOne: async () => null },
  });
  const res = response();
  await controller.updateContentBlock({
    params: { courseId: "1", topicId: "2", subtopicId: "3", contentId: "99" },
    body: { description: "<p>Text</p>" },
  }, res);
  assert.equal(res.statusCode, 404);
});
