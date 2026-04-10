const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Badge = db.pgConn.define('Badge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  milestone: {
    type: DataTypes.INTEGER,
    allowNull: false, // e.g., 5, 10, 15
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true, // e.g., 'trophy', 'star', 'medal'
  },
}, {
  timestamps: true,
});

module.exports = Badge;