const { DataTypes } = require('sequelize');
const db = require('../config/db');

const CourseTopics = db.pgConn.define('CourseTopics', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  topicKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  displayOrder: {
    type: DataTypes.INTEGER,
  },
  estimatedHours: {
    type: DataTypes.INTEGER,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['topicKey', 'courseId'], // composite unique constraint
    },
  ],
});

module.exports = CourseTopics;