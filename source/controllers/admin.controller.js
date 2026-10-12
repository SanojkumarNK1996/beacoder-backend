const bcrypt = require("bcrypt")
const { PASSWORD_HASH_SALT } = require("../config/constants");
const Users = require("../models/Users.model")
const MentorProfile = require("../models/MentorProfile.model");
const { Op } = require("sequelize");

const safeUserAttributes = [
  "id",
  "name",
  "email",
  "phone",
  "address",
  "officeCollege",
  "tag",
  "role",
  "isActive",
  "showMentor",
  "paymentStatus",
  "accessStartsAt",
  "accessExpiresAt",
  "createdAt",
  "updatedAt",
];
const safeMentorProfileAttributes = [
  "professionalTitle",
  "state",
  "district",
  "currentCompany",
  "previousCompanies",
  "totalExperience",
  "linkedinUrl",
  "imageUrl",
  "profileStatus",
  "visibility",
  "motherTongue",
  "languagesKnown",
  "technologiesKnown",
];
const editableMentorProfileFields = new Set(safeMentorProfileAttributes);
const editableUserFields = new Set([
  "name",
  "email",
  "phone",
  "address",
  "officeCollege",
  "tag",
  "role",
  "isActive",
  "showMentor",
  "paymentStatus",
  "accessStartsAt",
  "accessExpiresAt",
  "mentorProfile",
]);

const toSafeUser = (user) => {
  const record = typeof user.get === "function" ? user.get({ plain: true }) : user;
  const mentorProfile = record.mentorProfile
    ? Object.fromEntries(safeMentorProfileAttributes.map((field) => [field, record.mentorProfile[field]]))
    : null;
  return {
    ...Object.fromEntries(safeUserAttributes.map((field) => [field, record[field]])),
    mentorProfile,
  };
};

const findDuplicateField = (err) => {
  const fields = [
    ...Object.keys(err.fields || {}),
    ...(err.errors || []).map((item) => item.path),
    err.original?.constraint,
  ].filter(Boolean).join(" ").toLowerCase();

  if (fields.includes("email")) return "email";
  if (fields.includes("phone")) return "phone";
  return null;
};

const respondToUserError = (err, res) => {
  if (err.name === "SequelizeUniqueConstraintError" || err.original?.code === "23505") {
    const field = findDuplicateField(err);
    const message = field
      ? `A user with this ${field} already exists`
      : "A user with this email or phone already exists";
    return res.status(409).json({ success: false, message, field });
  }

  return res.status(500).json({ success: false, message: "Unable to process user request" });
};

const getUsers = async (req, res) => {
  try {
    if (req.query.search !== undefined && typeof req.query.search !== "string") {
      return res.status(400).json({ success: false, message: "Search must be a string" });
    }

    const search = (req.query.search || "").trim();
    const where = {};
    if (search) {
      const conditions = [{ name: { [Op.iLike]: `%${search}%` } }];
      if (/^\d+$/.test(search)) {
        const id = Number(search);
        if (Number.isSafeInteger(id) && id > 0) conditions.push({ id });
      }
      where[Op.or] = conditions;
    }

    const users = await Users.findAll({
      attributes: safeUserAttributes,
      include: [{
        model: MentorProfile,
        as: "mentorProfile",
        attributes: safeMentorProfileAttributes,
      }],
      where,
      order: [["id", "ASC"]],
    });

    return res.status(200).json({ success: true, data: users.map(toSafeUser) });
  } catch (err) {
    return respondToUserError(err, res);
  }
};

const updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: "User ID must be a positive integer" });
    }

    const updates = req.body;
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: "Request body must be an object" });
    }

    const fields = Object.keys(updates);
    const unknownFields = fields.filter((field) => !editableUserFields.has(field));
    if (unknownFields.length) {
      return res.status(400).json({
        success: false,
        message: `Unsupported user field${unknownFields.length > 1 ? "s" : ""}: ${unknownFields.join(", ")}`,
      });
    }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "At least one user field is required" });
    }

    const values = { ...updates };
    const hasMentorProfile = Object.hasOwn(values, "mentorProfile");
    const mentorProfile = values.mentorProfile;
    delete values.mentorProfile;

    if (hasMentorProfile && (!mentorProfile || typeof mentorProfile !== "object" || Array.isArray(mentorProfile))) {
      return res.status(400).json({ success: false, message: "mentorProfile must be an object" });
    }
    if (hasMentorProfile) {
      const unknownMentorFields = Object.keys(mentorProfile).filter((field) => !editableMentorProfileFields.has(field));
      if (unknownMentorFields.length) {
        return res.status(400).json({
          success: false,
          message: `Unsupported mentor profile field${unknownMentorFields.length > 1 ? "s" : ""}: ${unknownMentorFields.join(", ")}`,
        });
      }
    }
    if (Object.hasOwn(values, "name")) {
      if (typeof values.name !== "string" || !values.name.trim()) {
        return res.status(400).json({ success: false, message: "Name must be a non-empty string" });
      }
      values.name = values.name.trim();
    }
    if (Object.hasOwn(values, "email")) {
      if (typeof values.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
        return res.status(400).json({ success: false, message: "Email must be a valid email address" });
      }
      values.email = values.email.trim();
    }
    for (const field of ["phone", "address", "officeCollege"]) {
      if (Object.hasOwn(values, field)) {
        if (values[field] !== null && typeof values[field] !== "string") {
          return res.status(400).json({ success: false, message: `${field} must be a string or null` });
        }
        if (typeof values[field] === "string") values[field] = values[field].trim();
      }
    }
    if (Object.hasOwn(values, "role") && !["student", "instructor", "partner", "admin"].includes(values.role)) {
      return res.status(400).json({ success: false, message: "Role must be student, instructor, partner, or admin" });
    }
    if (Object.hasOwn(values, "tag") && !["CUSTOMER", "COMPANY"].includes(values.tag)) {
      return res.status(400).json({ success: false, message: "Tag must be CUSTOMER or COMPANY" });
    }
    if (Object.hasOwn(values, "isActive") && typeof values.isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive must be a boolean" });
    }
    if (Object.hasOwn(values, "showMentor") && typeof values.showMentor !== "boolean") {
      return res.status(400).json({ success: false, message: "showMentor must be a boolean" });
    }
    if (Object.hasOwn(values, "paymentStatus") &&
        !["pending", "paid", "premium", "failed", "refunded", "expired"].includes(values.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "paymentStatus must be pending, paid, premium, failed, refunded, or expired",
      });
    }
    for (const field of ["accessStartsAt", "accessExpiresAt"]) {
      if (!Object.hasOwn(values, field)) continue;
      if (values[field] === null || values[field] === "") {
        values[field] = null;
        continue;
      }
      const date = new Date(values[field]);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ success: false, message: `${field} must be a valid date or null` });
      }
      values[field] = date;
    }
    const user = await Users.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const accessStartsAt = Object.hasOwn(values, "accessStartsAt") ? values.accessStartsAt : user.accessStartsAt;
    const accessExpiresAt = Object.hasOwn(values, "accessExpiresAt") ? values.accessExpiresAt : user.accessExpiresAt;
    if (accessStartsAt && accessExpiresAt && new Date(accessExpiresAt) <= new Date(accessStartsAt)) {
      return res.status(400).json({
        success: false,
        message: "accessExpiresAt must be later than accessStartsAt",
      });
    }

    const resultingRole = values.role || user.role;
    if (hasMentorProfile && resultingRole !== "instructor") {
      return res.status(400).json({ success: false, message: "Mentor profile details require the instructor role" });
    }
    if (hasMentorProfile) {
      for (const field of safeMentorProfileAttributes) {
        if (!Object.hasOwn(mentorProfile, field)) continue;
        const value = mentorProfile[field];
        if (field === "totalExperience") {
          if (value === "" || value === null) {
            mentorProfile[field] = null;
          } else if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 999.99) {
            return res.status(400).json({ success: false, message: "Total experience must be between 0 and 999.99 years" });
          }
          continue;
        }
        if (field === "profileStatus") {
          if (!["Active", "Inactive"].includes(value)) {
            return res.status(400).json({ success: false, message: "Profile status must be Active or Inactive" });
          }
          continue;
        }
        if (field === "visibility") {
          if (!["yes", "no"].includes(value)) {
            return res.status(400).json({ success: false, message: "Visibility must be yes or no" });
          }
          continue;
        }
        if (value !== null && typeof value !== "string") {
          return res.status(400).json({ success: false, message: `${field} must be a string or null` });
        }
        if (typeof value === "string") mentorProfile[field] = value.trim() || null;
      }
      if (mentorProfile.linkedinUrl) {
        let linkedinUrl;
        try {
          linkedinUrl = new URL(mentorProfile.linkedinUrl);
        } catch {
          return res.status(400).json({ success: false, message: "LinkedIn URL must be a valid URL" });
        }
        if (!["http:", "https:"].includes(linkedinUrl.protocol)) {
          return res.status(400).json({ success: false, message: "LinkedIn URL must use http or https" });
        }
      }
      if (mentorProfile.imageUrl) {
        let imageUrl;
        try {
          imageUrl = new URL(mentorProfile.imageUrl);
        } catch {
          return res.status(400).json({ success: false, message: "Mentor image URL must be a valid URL" });
        }
        if (!["http:", "https:"].includes(imageUrl.protocol)) {
          return res.status(400).json({ success: false, message: "Mentor image URL must use http or https" });
        }
      }
    }

    const shouldEnsureMentorProfile = resultingRole === "instructor"
      && (hasMentorProfile || user.role !== "instructor");
    await Users.sequelize.transaction(async (transaction) => {
      await user.update(values, { transaction });
      if (!shouldEnsureMentorProfile) return;

      const existingProfile = await MentorProfile.findOne({ where: { userId: id }, transaction });
      if (existingProfile) {
        if (hasMentorProfile) await existingProfile.update(mentorProfile, { transaction });
      } else {
        await MentorProfile.create({ userId: id, ...(mentorProfile || {}) }, { transaction });
      }
    });
    const savedMentorProfile = await MentorProfile.findOne({ where: { userId: id } });
    const data = toSafeUser(user);
    data.mentorProfile = savedMentorProfile
      ? Object.fromEntries(safeMentorProfileAttributes.map((field) => [field, savedMentorProfile[field]]))
      : null;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return respondToUserError(err, res);
  }
};

const createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const hashedPassword = await bcrypt.hash(password, PASSWORD_HASH_SALT);

    const admin = await Users.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'admin',
      tag: 'CUSTOMER',
      isActive: true,
      paymentStatus: 'paid',
    });

    return res.status(201).json({ message: "Admin created successfully", admin: toSafeUser(admin) });
  } catch (err) {

    if (err.name === "SequelizeUniqueConstraintError") {
      const field = err.errors[0].path;
      const message = `${field} must be unique`;

      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: err.message });
  }
}

const conformPayment = async (req, res) => {
  try {
    const { emails } = req.body;


    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Emails array is required",
      });
    }

    const result = await Users.update(
      { isActive: true, paymentStatus: "paid" },
      {
        where: {
          email: emails,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Payment confirmed and users updated",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });

  } catch (err) {
    console.error("Payment confirmation error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while confirming payment",
    });
  }
}

module.exports = { createAdmin, conformPayment, getUsers, updateUser }