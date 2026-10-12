const { DataTypes } = require('sequelize');
const db = require('../config/db');

const CareerRoadmapCourses = db.pgConn.define('CareerRoadmapCourses', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  careerDomain: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  jobReadyProgram: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      name: 'career_roadmap_courses_domain_program_course_unique',
      fields: ['careerDomain', 'jobReadyProgram', 'courseId'],
    },
    {
      unique: true,
      name: 'career_roadmap_courses_domain_program_order_unique',
      fields: ['careerDomain', 'jobReadyProgram', 'displayOrder'],
    },
    { name: 'career_roadmap_courses_course_id_idx', fields: ['courseId'] },
  ],
});

module.exports = CareerRoadmapCourses;
