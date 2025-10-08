const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Subtopics = db.pgConn.define('Subtopics', {
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
    type: DataTypes.TEXT,
  },
  displayOrder: {
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
      fields: ['title', 'topicId'], // composite unique constraint
    },
  ],
});

module.exports = Subtopics;