const { DataTypes } = require('sequelize');
const db = require('../config/db');

const UserContentProgress = db.pgConn.define('UserContentProgress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  completedAt: {
    type: DataTypes.DATE,
  },
}, { timestamps: true });

module.exports = UserContentProgress;