const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Notification = db.pgConn.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  module: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subModule: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  iconType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metaData: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  redirectTo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  timestamps: true,
});

module.exports = Notification;
