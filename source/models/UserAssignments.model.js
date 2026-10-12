const { DataTypes } = require('sequelize');
const db = require('../config/db');

const UserAssignments = db.pgConn.define('UserAssignments', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assignmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assignedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('assigned', 'in_progress', 'submitted', 'completed', 'rejected'),
    allowNull: false,
    defaultValue: 'assigned',
  },
  textAnswer: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  submissionUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  marksObtained: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'assignmentId'],
    },
  ],
});

module.exports = UserAssignments;
