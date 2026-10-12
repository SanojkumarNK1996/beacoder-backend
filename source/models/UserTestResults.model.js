const { DataTypes } = require('sequelize');
const db = require('../config/db');

const UserTestResults = db.pgConn.define('UserTestResults', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  testId: { type: DataTypes.INTEGER, allowNull: false },
  assignedById: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM('NEW', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'NEW',
  },
  earnedMarks: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  totalMarks: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  courseMarks: { type: DataTypes.JSONB, allowNull: true },
  topicMarks: { type: DataTypes.JSONB, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  timestamps: true,
  indexes: [{ unique: true, fields: ['userId', 'testId'] }],
});

module.exports = UserTestResults;