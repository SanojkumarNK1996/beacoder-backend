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

const recruiterController = (Recruiter) => load("controllers/recruiter.controller.js", {
  sequelize: { Op },
  "../models/Recruiter.model": Recruiter,
  "../models/Users.model": {},
});

test("recruitment partners are available to premium users", async () => {
  const record = {
    id: 1,
    name: "Partner company",
    get() { return { ...this }; },
  };
  let findAllCalls = 0;
  const controller = recruiterController({
    findAll: async () => { findAllCalls++; return [record]; },
  });
  const res = response();

  await controller.list({
    user: { id: 7, role: "student", paymentStatus: "premium" },
    query: {},
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data[0].name, "Partner company");
  assert.equal(findAllCalls, 1);
});

for (const user of [
  { id: 7, role: "student", paymentStatus: "paid" },
  { id: 8, role: "student", paymentStatus: "pending" },
  { id: 9, role: "admin", paymentStatus: "paid" },
]) {
  test(`recruitment partners are withheld from ${user.role} users with ${user.paymentStatus} status`, async () => {
  let findAllCalls = 0;
  const controller = recruiterController({
    findAll: async () => { findAllCalls++; return []; },
  });
  const res = response();

  await controller.list({
    user,
    query: {},
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(findAllCalls, 0);
  });
}
