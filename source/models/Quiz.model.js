const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Quiz = db.pgConn.define('Quiz', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  displayOrder: {
    type: DataTypes.INTEGER,
  },
  tags: {
    type: DataTypes.STRING,
  },
  questionData: {
    type: DataTypes.JSONB,  // JSON format for Qs + options + answer
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, { timestamps: true });

module.exports = Quiz;