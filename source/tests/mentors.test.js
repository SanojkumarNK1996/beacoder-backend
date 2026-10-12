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
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("mentor directory returns only active profiles for active instructor accounts", async () => {
  const mentor = {
    user: { id: 17, name: "Ada Lovelace" },
    profileStatus: "Active",
    get() {
      return {
        user: this.user,
        profileStatus: this.profileStatus,
      };
    },
  };
  let query;
  const controller = load("controllers/mentor.controller.js", {
    "../models/MentorProfile.model": {
      findAll: async (options) => {
        query = options;
        return [mentor];
      },
    },
    "../models/Users.model": { name: "Users" },
  });
  const res = response();

  await controller.getActiveMentors({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data[0].user.name, "Ada Lovelace");
  assert.deepEqual(query.where, { profileStatus: "Active", visibility: "yes" });
  assert.ok(query.attributes.includes("technologiesKnown"));
  assert.deepEqual(query.include[0].where, { role: "instructor", isActive: true });
});
