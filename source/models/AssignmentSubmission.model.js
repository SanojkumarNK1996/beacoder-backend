const { DataTypes } = require('sequelize');
const db = require('../config/db');

const AssignmentSubmissions = db.pgConn.define('AssignmentSubmissions', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  textAnswer: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  submissionUrl: {
    type: DataTypes.TEXT,
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
  status: {
    type: DataTypes.ENUM('pending', 'submitted', 'accepted', 'rejected'),
    defaultValue: 'pending',
  },

  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }

}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['assignmentId', 'userId']
    }
  ]
});

module.exports = AssignmentSubmissions;