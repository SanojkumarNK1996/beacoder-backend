const { DataTypes } = require('sequelize');
const db = require('../config/db');

const QuizSubmission = db.pgConn.define('QuizSubmission', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  answers: { type: DataTypes.JSON, allowNull: false },
  score: { type: DataTypes.INTEGER, allowNull: false },
  submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: true });

module.exports = QuizSubmission;