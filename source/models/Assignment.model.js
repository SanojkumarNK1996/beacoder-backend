const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Assignments = db.pgConn.define('Assignments', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  assignmentKey: {
    type: DataTypes.STRING(320),
    allowNull: false,
    unique: true,
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'tough'),
    allowNull: false,
  },
  description: {
    type: DataTypes.JSONB, // Stores task text and optional context/expected output.
    allowNull: false,
  },
  subtopicKey: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: 'Subtopics', key: 'subtopicKey' },
    onUpdate: 'RESTRICT',
    onDelete: 'RESTRICT',
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
    { fields: ['subtopicKey'] },
  ]
});

module.exports = Assignments;