const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Tests = db.pgConn.define('Tests', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  testName: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  createdBy: { type: DataTypes.INTEGER, allowNull: false },
  questionKeys: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  questionCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  timestamps: true,
  validate: {
    questionKeysAreUnique() {
      if (!Array.isArray(this.questionKeys) || this.questionKeys.some((key) => typeof key !== 'string') ||
          new Set(this.questionKeys).size !== this.questionKeys.length) {
        throw new Error('questionKeys must be a unique array of strings');
      }
    },
  },
});

module.exports = Tests;