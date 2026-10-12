const CourseEnrollments = require('../models/CourseEnrollments.model');
const Courses = require('../models/Courses.model');
const { Op } = require("sequelize");

// Create a new course
const createCourse = async (req, res) => {
    try {
        const { courseKey, courseName, description, difficultyLevel, estimatedHours, imageUrl, displayOrder, isActive } = req.body;

        if (isActive !== undefined && typeof isActive !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
        }

        const newCourse = await Courses.create({
            courseKey,
            courseName,
            description,
            difficultyLevel,
            estimatedHours,
            imageUrl,
            displayOrder,
            isActive: isActive === true
        });

        res.status(201).json({ success: true, data: newCourse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update course
const updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (req.body.isActive !== undefined && typeof req.body.isActive !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
        }

        const [updated] = await Courses.update(req.body, {
            where: { id: courseId },
        });

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const updatedCourse = await Courses.findByPk(courseId);
        res.status(200).json({ success: true, data: updatedCourse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete course
const deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        const deleted = await Courses.destroy({ where: { id: courseId } });

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all courses
const getAllCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Get enrolled course IDs
    const enrolledCourses = await CourseEnrollments.findAll({
      where: { userId },
      attributes: ["courseId"]
    });

    const enrolledCourseIds = enrolledCourses.map(e => e.courseId);

    // Return all courses the user is not enrolled in; clients can lock inactive ones.
    const courses = await Courses.findAll({
      where: {
        id: {
          [Op.notIn]: enrolledCourseIds.length > 0
            ? enrolledCourseIds
            : [0] // fallback to avoid empty array issue
        }
      },
    order: [["displayOrder", "ASC"], ["id", "ASC"]]
    });

    res.json({ success: true, data: courses });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCourseById = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Courses.findByPk(courseId);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.status(200).json({ success: true, data: course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllCourses,
    deleteCourse,
    updateCourse,
    createCourse,
    getCourseById
}