const { DataTypes } = require('sequelize');
const db = require('../config/db');

const UserNotes = db.pgConn.define('UserNotes', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  topicId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'CourseTopics',
      key: 'id'
    }
  },
  subtopicId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Subtopics',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'UserNotes',
  timestamps: true,
});

module.exports = UserNotes;