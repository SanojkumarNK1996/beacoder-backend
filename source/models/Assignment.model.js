const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Assignments = db.pgConn.define('Assignments', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.JSONB, // Stores  text, lists, etc.
    allowNull: false,
  },
  allowedSubmissionType: {
    type: DataTypes.ENUM('TEXT', 'URL'),
    allowNull: false,
    defaultValue: 'URL'
  },
  maxMarks: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
  },

  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }

}, {
  timestamps: true,
  indexes: [
    {
      fields: ['courseId']
    },
    {
      fields: ['topicId']
    },
    {
      fields: ['subtopicId']
    }
  ]
});

module.exports = Assignments;