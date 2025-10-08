const Courses = require('../models/Courses.model');

// Create a new course
const createCourse = async (req, res) => {
    try {
        const { courseCode, courseName, description, difficultyLevel, estimatedHours, imageUrl } = req.body;

        const newCourse = await Courses.create({
            courseCode,
            courseName,
            description,
            difficultyLevel,
            estimatedHours,
            imageUrl
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

        const [updated] = await Courses.update(req.body, {
            where: { id: courseId },
        });
        console.log("req.body", req.body)

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
        const courses = await Courses.findAll({
            where: { isActive: true },
            order: [['createdAt', 'DESC']],
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