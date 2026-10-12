const { DataTypes } = require("sequelize");
const db = require("../config/db");
const Users = require("./Users.model");

const Recruiter = db.pgConn.define("Recruiter", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.ENUM("Company", "Person"),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  location: DataTypes.STRING,
  technologies: DataTypes.TEXT,
  hiringRoles: DataTypes.TEXT,
  careerPage: DataTypes.STRING,
  hrPhone: DataTypes.STRING,
  hrEmail: DataTypes.STRING,
  hrLinkedinUrl: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM(
      "Not applied",
      "Applied",
      "Interview scheduled",
      "Selected",
      "Rejected",
    ),
    allowNull: false,
    defaultValue: "Not applied",
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Users,
      key: "id",
    },
  },
}, { timestamps: true });

module.exports = Recruiter;
