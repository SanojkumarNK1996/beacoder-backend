const { DataTypes } = require("sequelize");
const db = require("../config/db");
const Users = require("./Users.model");

const MentorProfile = db.pgConn.define("MentorProfile", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: Users,
      key: "id",
    },
  },
  professionalTitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  district: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  currentCompany: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  previousCompanies: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  totalExperience: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  linkedinUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profileStatus: {
    type: DataTypes.ENUM("Active", "Inactive"),
    allowNull: false,
    defaultValue: "Inactive",
  },
  visibility: {
    type: DataTypes.ENUM("yes", "no"),
    allowNull: false,
    defaultValue: "no",
  },
  motherTongue: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  languagesKnown: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  technologiesKnown: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, { timestamps: true });

module.exports = MentorProfile;
