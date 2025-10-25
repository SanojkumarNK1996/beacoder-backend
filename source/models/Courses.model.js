const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Courses = db.pgConn.define('Courses', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  courseCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  courseName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  imageUrl: {
    type: DataTypes.STRING,
  },
  difficultyLevel: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    defaultValue: 'easy',
  },
  estimatedHours: {
    type: DataTypes.INTEGER,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, { timestamps: true });

module.exports = Courses;