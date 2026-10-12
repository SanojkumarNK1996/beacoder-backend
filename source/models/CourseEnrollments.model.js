const { DataTypes } = require('sequelize');
const db = require('../config/db');
const Courses = require('./Courses.model');

const requireBooleanActivation = (values) => {
  if (values.isActive !== undefined && typeof values.isActive !== 'boolean') {
    const error = new Error('isActive must be a boolean');
    error.statusCode = 400;
    throw error;
  }
};

const requireActiveCourse = async (enrollment, options) => {
  requireBooleanActivation(enrollment);
  const course = await Courses.findByPk(enrollment.courseId, {
    transaction: options.transaction,
  });
  if (!course || course.isActive !== true) {
    const error = new Error('This course is inactive and cannot be enrolled in');
    error.statusCode = 403;
    throw error;
  }
};

const requireActiveConflictCourse = async (values, fields, options) => {
  requireBooleanActivation(values);
  const existing = values.id == null ? null : await CourseEnrollments.findByPk(values.id, {
    transaction: options.transaction,
  });
  if (!existing) {
    await requireActiveCourse(values, options);
  } else if (fields.includes('courseId') || (fields.includes('isActive') && values.isActive === true)) {
    await requireActiveCourse({
      courseId: fields.includes('courseId') ? values.courseId : existing.courseId,
    }, options);
  }
};

const CourseEnrollments = db.pgConn.define('CourseEnrollments', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  completionPercentage: {
    type: DataTypes.DECIMAL(5,2),
    defaultValue: 0.00,
  },
  lastAccessed: {
    type: DataTypes.DATE,
  },
  enrolledAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: requireActiveCourse,
    beforeBulkCreate: async (enrollments, options) => {
      // Check the entire batch before Sequelize writes any enrollment.
      for (const enrollment of enrollments) {
        if (options.updateOnDuplicate) {
          await requireActiveConflictCourse(enrollment, options.updateOnDuplicate, options);
        } else {
          await requireActiveCourse(enrollment, options);
        }
      }
    },
    beforeUpsert: async (values, options) => {
      await requireActiveConflictCourse(values, options.fields, options);
    },
    beforeUpdate: async (enrollment, options) => {
      requireBooleanActivation(enrollment);
      if (enrollment.changed('courseId') || (enrollment.changed('isActive') && enrollment.isActive === true)) {
        await requireActiveCourse(enrollment, options);
      }
    },
    beforeBulkUpdate: async (options) => {
      requireBooleanActivation(options.attributes);
      if (options.attributes.courseId !== undefined) {
        await requireActiveCourse(options.attributes, options);
      } else if (options.attributes.isActive === true) {
        const enrollments = await CourseEnrollments.findAll({
          where: options.where,
          attributes: ['courseId'],
          transaction: options.transaction,
        });
        for (const courseId of new Set(enrollments.map((enrollment) => enrollment.courseId))) {
          await requireActiveCourse({ courseId }, options);
        }
      }
    },
  },
});

module.exports = CourseEnrollments;