const { DataTypes } = require('sequelize');
const db = require('../config/db');

const UserSubtopicReview = db.pgConn.define('UserSubtopicReview', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  selection: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['UNDERSTOOD', 'NEEDS_MORE', 'NOT_GOOD']],
    },
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      name: 'user_subtopic_reviews_user_subtopic_unique',
      fields: ['userId', 'subtopicId'],
    },
  ],
});

module.exports = UserSubtopicReview;