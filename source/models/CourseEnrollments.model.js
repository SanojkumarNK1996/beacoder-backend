const { DataTypes } = require('sequelize');
const db = require('../config/db');

const CourseEnrollments = db.pgConn.define('CourseEnrollments', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  completionPercentage: {
    type: DataTypes.DECIMAL(5,2),
    defaultValue: 0.00,
  },
  lastAccessed: {
    type: DataTypes.DATE,
  },
  enrolledAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, { timestamps: true });

module.exports = CourseEnrollments;