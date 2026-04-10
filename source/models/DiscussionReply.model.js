const { DataTypes } = require('sequelize');
const db = require('../config/db');

const DiscussionReply = db.pgConn.define('DiscussionReply', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  discussionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  }
}, {
  timestamps: true,
});

module.exports = DiscussionReply;
