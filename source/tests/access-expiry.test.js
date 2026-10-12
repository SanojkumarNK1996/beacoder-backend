const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

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
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("requireAuth blocks expired access even when the JWT is valid", async () => {
  const { requireAuth } = load("middleware/authorize.js", {
    jsonwebtoken: { verify: () => ({ id: 7 }) },
    "../models/Users.model": {
      findByPk: async () => ({
        id: 7,
        email: "demo@example.com",
        role: "student",
        name: "Demo User",
        paymentStatus: "pending",
        accessExpiresAt: new Date(Date.now() - 1000),
      }),
    },
    "../config/constants": { JWT_SECRET: "test-secret" },
  });
  const res = response();
  let nextCalled = false;

  await requireAuth(
    { headers: { authorization: "Bearer valid-token" } },
    res,
    () => { nextCalled = true; },
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "ACCESS_EXPIRED");
  assert.equal(nextCalled, false);
});

test("requireAuth allows users whose access has not expired", async () => {
  const { requireAuth } = load("middleware/authorize.js", {
    jsonwebtoken: { verify: () => ({ id: 8 }) },
    "../models/Users.model": {
      findByPk: async () => ({
        id: 8,
        email: "demo@example.com",
        role: "student",
        name: "Demo User",
        paymentStatus: "pending",
        showMentor: true,
        accessStartsAt: new Date(Date.now() - 1000),
        accessExpiresAt: new Date(Date.now() + 60_000),
      }),
    },
    "../config/constants": { JWT_SECRET: "test-secret" },
  });
  const req = { headers: { authorization: "Bearer valid-token" } };
  const res = response();
  let nextCalled = false;

  await requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.equal(req.user.accessExpiresAt instanceof Date, true);
  assert.equal(req.user.showMentor, true);
});
