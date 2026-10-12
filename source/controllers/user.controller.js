const CourseEnrollments = require("../models/CourseEnrollments.model.js");
const Courses = require('../models/Courses.model');
const Subtopics = require("../models/Subtopics.model");
const CourseTopics = require("../models/CourseTopics.model");
const UserSubtopicReview = require("../models/UserSubtopicReview.model");
const db = require("../config/db");

const REVIEW_SELECTIONS = ['UNDERSTOOD', 'NEEDS_MORE', 'NOT_GOOD'];

const enrollInCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;
        const course = await Courses.findByPk(courseId);

        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }
        if (course.isActive !== true) {
            return res.status(403).json({
                success: false,
                message: "This course is inactive and cannot be enrolled in"
            });
        }

        const existing = await CourseEnrollments.findOne({ where: { userId, courseId } });
        if (existing) {
            return res.status(400).json({ message: "Already enrolled" });
        }

        const enrollment = await CourseEnrollments.create({
            userId,
            courseId,
            completionPercentage: 0
        });
        return res.status(201).json({ success: true, data: enrollment });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const getUserCourses = async (req, res) => {
    try {
        const userId = req.user.id;
        const enrollments = await CourseEnrollments.findAll({
            where: { userId },
            include: [{
                model: Courses,
                attributes: [
                    "id",
                    "courseName",
                    "courseKey",
                    "imageUrl",
                    "difficultyLevel",
                    "estimatedHours",
                    "isActive"
                ]
            }],
            order: [["updatedAt", "DESC"]]
        });

        const formatted = enrollments.map(enrollment => ({
            courseId: enrollment.Course.id,
            courseName: enrollment.Course.courseName,
            courseKey: enrollment.Course.courseKey,
            imageUrl: enrollment.Course.imageUrl,
            difficultyLevel: enrollment.Course.difficultyLevel,
            estimatedHours: enrollment.Course.estimatedHours,
            isActive: enrollment.Course.isActive,
            completionPercentage: enrollment.completionPercentage,
            lastAccessed: enrollment.lastAccessed
        }));

        return res.json({ success: true, data: formatted });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const findSubtopicForUser = async (subtopicId, userId, transaction, lockEnrollment = false) => {
    const subtopic = await Subtopics.findByPk(subtopicId, {
        include: [{ model: CourseTopics, required: true }],
        transaction
    });

    if (!subtopic || !subtopic.CourseTopic) {
        return { error: { status: 404, message: "Subtopic not found" } };
    }

    const courseId = subtopic.CourseTopic.courseId;
    const enrollment = await CourseEnrollments.findOne({
        where: { userId, courseId },
        transaction,
        ...(lockEnrollment ? { lock: transaction.LOCK.UPDATE } : {})
    });

    if (!enrollment) {
        return { error: { status: 403, message: "User not enrolled in this course" } };
    }

    return { subtopic, courseId, enrollment };
};

const getSubtopicReview = async (req, res) => {
    try {
        const { subtopicId } = req.params;
        const userId = req.user.id;
        const result = await findSubtopicForUser(subtopicId, userId);

        if (result.error) {
            return res.status(result.error.status).json({ message: result.error.message });
        }

        const review = await UserSubtopicReview.findOne({ where: { userId, subtopicId } });
        return res.json({
            success: true,
            data: {
                subtopicId: Number(subtopicId),
                selection: review?.selection || null,
                completionPercentage: result.enrollment.completionPercentage
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const saveSubtopicReview = async (req, res) => {
    let transaction;

    try {
        const { subtopicId } = req.params;
        const { selection } = req.body || {};
        const userId = req.user.id;

        if (!Number.isInteger(Number(subtopicId)) || Number(subtopicId) < 1) {
            return res.status(400).json({ message: "A valid subtopicId is required" });
        }
        if (!REVIEW_SELECTIONS.includes(selection)) {
            return res.status(400).json({
                message: `selection must be one of: ${REVIEW_SELECTIONS.join(', ')}`
            });
        }

        transaction = await db.pgConn.transaction();
        const result = await findSubtopicForUser(subtopicId, userId, transaction, true);

        if (result.error) {
            await transaction.rollback();
            return res.status(result.error.status).json({ message: result.error.message });
        }
        if (result.subtopic.isActive !== true) {
            await transaction.rollback();
            return res.status(403).json({ message: "This subtopic is not available for review" });
        }

        // The unique user/subtopic index makes this an idempotent create-or-update.
        await UserSubtopicReview.upsert({
            userId,
            subtopicId: result.subtopic.id,
            selection
        }, { transaction });

        const totalSubtopics = await Subtopics.count({
            where: { isActive: true },
            include: [{
                model: CourseTopics,
                where: { courseId: result.courseId },
                required: true
            }],
            transaction
        });
        const reviewedSubtopics = await UserSubtopicReview.count({
            where: { userId },
            include: [{
                model: Subtopics,
                where: { isActive: true },
                required: true,
                include: [{
                    model: CourseTopics,
                    where: { courseId: result.courseId },
                    required: true
                }]
            }],
            distinct: true,
            transaction
        });
        const completionPercentage = totalSubtopics === 0
            ? 0
            : Number(((reviewedSubtopics / totalSubtopics) * 100).toFixed(2));

        await result.enrollment.update({
            completionPercentage,
            lastAccessed: new Date()
        }, { transaction });

        const review = await UserSubtopicReview.findOne({
            where: { userId, subtopicId: result.subtopic.id },
            transaction
        });
        await transaction.commit();

        return res.json({
            success: true,
            message: "Subtopic review saved",
            data: {
                subtopicId: result.subtopic.id,
                selection: review.selection,
                reviewedSubtopics,
                totalSubtopics,
                completionPercentage
            }
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    enrollInCourse,
    getUserCourses,
    getSubtopicReview,
    saveSubtopicReview
};
