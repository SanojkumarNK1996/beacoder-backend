const { DataTypes } = require('sequelize');
const db = require('../config/db');

const QuizQuestions = db.pgConn.define('QuizQuestions', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  questionKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  subtopicKey: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: 'Subtopics', key: 'subtopicKey' },
    onUpdate: 'RESTRICT',
    onDelete: 'RESTRICT',
  },
  type: {
    type: DataTypes.ENUM('MCQ', 'CODING', 'TEXT'),
    allowNull: false,
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  difficulty: {
    type: DataTypes.ENUM('EASY', 'MEDIUM', 'HARD', 'VERY HARD'),
    allowNull: false,
  },
  timeLimitSeconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1 },
  },
  content: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  answer: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'RESTRICT',
    onDelete: 'SET NULL',
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['subtopicKey'] },
    { fields: ['subtopicKey', 'isActive', 'displayOrder'] },
  ],
});

module.exports = QuizQuestions;
