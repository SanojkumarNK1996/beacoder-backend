const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { Op } = require("sequelize");

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

const makeUser = (values = {}) => {
  const user = {
    id: 1,
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: null,
    address: null,
    officeCollege: null,
    role: "student",
    isActive: true,
    showMentor: false,
    paymentStatus: "paid",
    password: "secret-hash",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-02T00:00:00.000Z"),
    ...values,
  };
  if (!values.update) user.update = async (updates) => Object.assign(user, updates);
  if (!values.get) user.get = () => ({ ...user });
  return user;
};

const emptyMentorProfileModel = {
  findOne: async () => null,
  create: async (values) => values,
};

const adminController = (Users, MentorProfile = emptyMentorProfileModel) => {
  Users.sequelize ||= { transaction: async (callback) => callback({}) };
  return load("controllers/admin.controller.js", {
    bcrypt: {},
    "../config/constants": { PASSWORD_HASH_SALT: 10 },
    "../models/Users.model": Users,
    "../models/MentorProfile.model": MentorProfile,
    sequelize: { Op },
  });
};

test("admin user listing searches by name or numeric ID and returns safe fields", async () => {
  const user = makeUser();
  const calls = [];
  const controller = adminController({
    findAll: async (options) => { calls.push(options); return [user]; },
  });

  const res = response();
  await controller.getUsers({ query: { search: "ada" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data[0].id, user.id);
  assert.equal(Object.hasOwn(res.body.data[0], "password"), false);
  assert.equal(res.body.data[0].showMentor, false);
  assert.ok(calls[0].attributes.includes("email"));
  assert.ok(calls[0].attributes.includes("showMentor"));
  assert.equal(calls[0].attributes.includes("password"), false);
  assert.equal(calls[0].where[Op.or][0].name[Op.iLike], "%ada%");

  await controller.getUsers({ query: { search: "42" } }, response());
  assert.ok(calls[1].where[Op.or].some((condition) => condition.id === 42));

  await controller.getUsers({ query: {} }, response());
  assert.deepEqual(calls[2].where, {});
});

test("admin user update changes only validated fields and never returns password", async () => {
  const user = makeUser();
  let lookedUpId;
  let updates;
  user.update = async (values) => {
    updates = values;
    Object.assign(user, values);
  };
  const controller = adminController({
    findByPk: async (id) => { lookedUpId = id; return user; },
  });
  const res = response();
  await controller.updateUser({
    params: { id: "1" },
    body: { name: "  Grace Hopper ", role: "instructor", isActive: false, showMentor: true },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(lookedUpId, 1);
  assert.deepEqual(updates, { name: "Grace Hopper", role: "instructor", isActive: false, showMentor: true });
  assert.equal(res.body.data.name, "Grace Hopper");
  assert.equal(res.body.data.showMentor, true);
  assert.equal(Object.hasOwn(res.body.data, "password"), false);
});

test("admin user update accepts premium payment status", async () => {
  const user = makeUser();
  let updates;
  user.update = async (values) => {
    updates = values;
    Object.assign(user, values);
  };
  const controller = adminController({
    findByPk: async () => user,
  });
  const res = response();

  await controller.updateUser({
    params: { id: "1" },
    body: { paymentStatus: "premium" },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(updates, { paymentStatus: "premium" });
  assert.equal(res.body.data.paymentStatus, "premium");
});

test("promoting a user to instructor saves mentor details and supports the partner role", async () => {
  const user = makeUser();
  const savedProfiles = [];
  let persistedRole;
  user.update = async (values) => {
    Object.assign(user, values);
    persistedRole = values.role;
  };
  const mentorProfile = {
    findOne: async () => savedProfiles[0] || null,
    create: async (values) => {
      const profile = { ...values };
      savedProfiles.push(profile);
      return profile;
    },
  };
  const controller = adminController({
    findByPk: async () => user,
  }, mentorProfile);
  const res = response();

  await controller.updateUser({
    params: { id: "1" },
    body: {
      role: "instructor",
      mentorProfile: {
        professionalTitle: "Senior Engineer",
        state: "California",
        district: "San Francisco",
        currentCompany: "Example Corp",
        previousCompanies: "A Inc, B LLC",
        totalExperience: 8.5,
        linkedinUrl: "https://linkedin.com/in/example",
        imageUrl: "https://cdn.example.com/mentor.jpg",
        profileStatus: "Active",
        motherTongue: "English",
        languagesKnown: "English, Spanish",
        technologiesKnown: "JavaScript, React, Node.js",
      },
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(persistedRole, "instructor");
  assert.equal(savedProfiles.length, 1);
  assert.equal(savedProfiles[0].userId, user.id);
  assert.equal(savedProfiles[0].professionalTitle, "Senior Engineer");
  assert.equal(savedProfiles[0].imageUrl, "https://cdn.example.com/mentor.jpg");
  assert.equal(savedProfiles[0].profileStatus, "Active");
  assert.equal(savedProfiles[0].technologiesKnown, "JavaScript, React, Node.js");

  const partnerRes = response();
  await controller.updateUser({
    params: { id: "1" },
    body: { role: "partner" },
  }, partnerRes);
  assert.equal(partnerRes.statusCode, 200);
});

test("admin user update rejects immutable, arbitrary, empty, and invalid enum values", async () => {
  let lookups = 0;
  const controller = adminController({
    findByPk: async () => { lookups++; return makeUser(); },
  });

  for (const body of [
    { password: "changed" },
    { id: 2 },
    { createdAt: "2025-01-01" },
    { unexpected: true },
    { mentorProfile: { unexpected: true } },
    {},
    { role: "owner" },
    { paymentStatus: "processing" },
    { isActive: "false" },
    { showMentor: "true" },
    { email: "not-an-email" },
    { name: "  " },
  ]) {
    const res = response();
    await controller.updateUser({ params: { id: "1" }, body }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(body));
  }
  assert.equal(lookups, 0);
});

test("admin user update returns not found and useful duplicate conflicts", async () => {
  const user = makeUser({ update: async () => {
    throw Object.assign(new Error("Duplicate"), {
      name: "SequelizeUniqueConstraintError",
      errors: [{ path: "email" }],
    });
  } });
  const controller = adminController({
    findByPk: async (id) => id === 9 ? null : user,
  });

  const notFound = response();
  await controller.updateUser({ params: { id: "9" }, body: { name: "New Name" } }, notFound);
  assert.equal(notFound.statusCode, 404);

  const duplicate = response();
  await controller.updateUser({ params: { id: "1" }, body: { email: "taken@example.com" } }, duplicate);
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.body.field, "email");
  assert.match(duplicate.body.message, /email already exists/i);
});

test("admin creation response never includes the password hash", async () => {
  const createdUser = makeUser({ password: "hashed-password" });
  const controller = load("controllers/admin.controller.js", {
    bcrypt: { hash: async () => "hashed-password" },
    "../config/constants": { PASSWORD_HASH_SALT: 10 },
    "../models/Users.model": { create: async () => createdUser },
    "../models/MentorProfile.model": emptyMentorProfileModel,
    sequelize: { Op },
  });
  const res = response();
  await controller.createAdmin({
    body: { name: "New Admin", email: "admin@example.com", password: "secret", phone: "123" },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(Object.hasOwn(res.body.admin, "password"), false);
  assert.equal(res.body.admin.id, createdUser.id);
});

test("admin user routes require authentication followed by admin authorization", () => {
  const registrations = [];
  const router = {
    get(...args) { registrations.push(["get", ...args]); },
    put(...args) { registrations.push(["put", ...args]); },
    post(...args) { registrations.push(["post", ...args]); },
  };
  const requireAuth = () => {};
  const authorize = (role) => ({ role });
  load("routes/admin.routes.js", {
    express: { Router: () => router },
    "../controllers/admin.controller.js": { getUsers() {}, updateUser() {}, createAdmin() {}, conformPayment() {} },
    "../middleware/authorize": { requireAuth, authorize },
  });

  const listRoute = registrations.find(([method, route]) => method === "get" && route === "/users");
  const updateRoute = registrations.find(([method, route]) => method === "put" && route === "/users/:id");
  for (const route of [listRoute, updateRoute]) {
    assert.equal(route[2], requireAuth);
    assert.deepEqual(route[3], { role: "admin" });
  }
});

test("admin authorization respects the authenticated database user role", () => {
  const { authorize } = load("middleware/authorize.js", {
    jsonwebtoken: { verify: () => assert.fail("A verified user should not be replaced by the token role") },
    "../models/Users.model": {},
    "../config/constants": { JWT_SECRET: "test-secret" },
  });

  const res = response();
  let nextCalled = false;
  authorize("admin")({ user: { id: 1, role: "student" } }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);

  const adminRes = response();
  authorize("admin")({ user: { id: 1, role: "admin" } }, adminRes, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
