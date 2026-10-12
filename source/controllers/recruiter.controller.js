const { Op } = require("sequelize");
const Recruiter = require("../models/Recruiter.model");
const Users = require("../models/Users.model");

const statuses = ["Not applied", "Applied", "Interview scheduled", "Selected", "Rejected"];
const types = ["Company", "Person"];
const editableFields = new Set([
  "type", "name", "location", "technologies", "hiringRoles", "careerPage",
  "hrPhone", "hrEmail", "hrLinkedinUrl", "status",
]);

const safeFields = [
  "id", "type", "name", "location", "technologies", "hiringRoles", "careerPage",
  "hrPhone", "hrEmail", "hrLinkedinUrl", "status", "createdBy", "createdAt", "updatedAt",
];

const toSafeRecruiter = (record, includeOwner = false, includeStatus = true) => {
  const plain = typeof record.get === "function" ? record.get({ plain: true }) : record;
  const data = Object.fromEntries(safeFields.map((field) => [field, plain[field]]));
  if (!includeStatus) delete data.status;
  if (includeOwner) data.createdByName = plain.creator?.name || null;
  return data;
};

const validateValues = (values, partial = false) => {
  if (!partial && (!values.name || typeof values.name !== "string" || !values.name.trim())) {
    return "Name is required";
  }
  if (!partial && !types.includes(values.type)) return "Type must be Company or Person";
  if (Object.hasOwn(values, "type") && !types.includes(values.type)) {
    return "Type must be Company or Person";
  }
  if (Object.hasOwn(values, "status") && !statuses.includes(values.status)) {
    return "Status is invalid";
  }
  for (const field of ["name", "location", "technologies", "hiringRoles", "careerPage", "hrPhone", "hrEmail", "hrLinkedinUrl"]) {
    if (Object.hasOwn(values, field) && values[field] !== null && typeof values[field] !== "string") {
      return `${field} must be a string or null`;
    }
    if (typeof values[field] === "string") values[field] = values[field].trim() || null;
  }
  if (values.hrEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.hrEmail)) return "HR email must be valid";
  for (const field of ["careerPage", "hrLinkedinUrl"]) {
    if (!values[field]) continue;
    try {
      const url = new URL(values[field]);
      if (!["http:", "https:"].includes(url.protocol)) return `${field} must use http or https`;
    } catch {
      return `${field} must be a valid URL`;
    }
  }
  return null;
};

const includeCreator = { model: Users, as: "creator", attributes: ["id", "name"] };

const list = async (req, res) => {
  const isAdmin = req.user.role === "admin";
  if (req.query.view !== "mine" && req.user.paymentStatus !== "premium") {
    return res.status(403).json({ success: false, message: "Recruitment is available to premium candidates only" });
  }
  const where = req.query.view === "mine"
    ? { createdBy: req.user.id }
    : (isAdmin ? {} : { createdBy: { [Op.ne]: req.user.id } });
  const records = await Recruiter.findAll({
    where,
    include: [includeCreator],
    order: [["updatedAt", "DESC"]],
  });
  return res.json({
    success: true,
    data: records.map((record) => toSafeRecruiter(record, isAdmin, isAdmin || req.query.view === "mine")),
  });
};

const create = async (req, res) => {
  const values = { ...req.body };
  const unknownFields = Object.keys(values).filter((field) => !editableFields.has(field));
  if (unknownFields.length) return res.status(400).json({ success: false, message: `Unsupported field: ${unknownFields.join(", ")}` });
  const error = validateValues(values);
  if (error) return res.status(400).json({ success: false, message: error });
  const record = await Recruiter.create({ ...values, createdBy: req.user.id });
  return res.status(201).json({ success: true, data: toSafeRecruiter(record) });
};

const update = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: "Recruiter ID must be a positive integer" });
  const values = { ...req.body };
  const unknownFields = Object.keys(values).filter((field) => !editableFields.has(field));
  if (unknownFields.length) return res.status(400).json({ success: false, message: `Unsupported field: ${unknownFields.join(", ")}` });
  const error = validateValues(values, true);
  if (error) return res.status(400).json({ success: false, message: error });
  const record = await Recruiter.findByPk(id);
  if (!record) return res.status(404).json({ success: false, message: "Recruiter record not found" });
  if (req.user.role !== "admin" && record.createdBy !== req.user.id) {
    return res.status(403).json({ success: false, message: "Only the creator can update this recruiter record" });
  }
  await record.update(values);
  return res.json({ success: true, data: toSafeRecruiter(record) });
};

const remove = async (req, res) => {
  const id = Number(req.params.id);
  const record = await Recruiter.findByPk(id);
  if (!record) return res.status(404).json({ success: false, message: "Recruiter record not found" });
  if (req.user.role !== "admin" && record.createdBy !== req.user.id) {
    return res.status(403).json({ success: false, message: "Only the creator can delete this recruiter record" });
  }
  await record.destroy();
  return res.json({ success: true });
};

module.exports = { list, create, update, remove };
