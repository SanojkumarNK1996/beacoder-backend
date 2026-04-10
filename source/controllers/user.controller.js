const CourseEnrollments = require("../models/CourseEnrollments.model.js")
const Courses = require('../models/Courses.model');
const UserContentProgress = require("../models/UserContentProgress.model");
const ContentBlocks = require("../models/ContentTable.model");
const Subtopics = require("../models/Subtopics.model");
const CourseTopics = require("../models/CourseTopics.model");
const Assignments = require("../models/Assignment.model.js");
const Notification = require("../models/Notification.model");
const Badge = require("../models/Badge.model");
const UserBadge = require("../models/UserBadge.model");

const db = require("../config/db");
const AssignmentSubmissions = require("../models/AssignmentSubmission.model.js");

const enrollInCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        const existing = await CourseEnrollments.findOne({
            where: { userId, courseId }
        });

        if (existing) {
            return res.status(400).json({ message: "Already enrolled" });
        }

        const enrollment = await CourseEnrollments.create({
            userId,
            courseId,
            completionPercentage: 0
        });

        res.status(201).json({ success: true, data: enrollment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUserCourses = async (req, res) => {

    try {
        const userId = req.user.id;

        const enrollments = await CourseEnrollments.findAll({
            where: { userId },
            include: [
                {
                    model: Courses,
                    attributes: [
                        "id",
                        "courseName",
                        "courseCode",
                        "imageUrl",
                        "difficultyLevel",
                        "estimatedHours"
                    ]
                }
            ],
            order: [["updatedAt", "DESC"]]
        });

        const formatted = enrollments.map(enrollment => ({
            courseId: enrollment.Course.id,
            courseName: enrollment.Course.courseName,
            courseCode: enrollment.Course.courseCode,
            imageUrl: enrollment.Course.imageUrl,
            difficultyLevel: enrollment.Course.difficultyLevel,
            estimatedHours: enrollment.Course.estimatedHours,
            completionPercentage: enrollment.completionPercentage,
            lastAccessed: enrollment.lastAccessed
        }));

        res.json({ success: true, data: formatted });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }

};

const markContentCompleted = async (req, res) => {
    const transaction = await db.pgConn.transaction();

    try {
        const { contentBlockId } = req.params;
        const userId = req.user.id;

        // 1️⃣ Fetch content with full hierarchy
        const content = await ContentBlocks.findByPk(contentBlockId, {
            include: [
                {
                    model: Subtopics,
                    include: [
                        {
                            model: CourseTopics,
                            include: [
                                {
                                    model: Courses,
                                    as: 'Course'
                                }
                            ]
                        }
                    ]
                }
            ],
            transaction
        });

        if (!content) {
            await transaction.rollback();
            return res.status(404).json({ message: "Content not found" });
        }

        if (!content.Subtopic || !content.Subtopic.CourseTopic) {
            await transaction.rollback();
            return res.status(400).json({ message: "Invalid content hierarchy" });
        }

        const courseId = content.Subtopic.CourseTopic.courseId;
        const subtopicId = content.Subtopic.id; // Grab the subtopic ID for later

        // 2️⃣ Check enrollment
        const enrollment = await CourseEnrollments.findOne({
            where: { userId, courseId },
            transaction
        });

        if (!enrollment) {
            await transaction.rollback();
            return res.status(403).json({ message: "User not enrolled in this course" });
        }

        // 3️⃣ Prevent duplicate completion
        const existing = await UserContentProgress.findOne({
            where: { userId, contentBlockId },
            transaction
        });

        if (existing) {
            await transaction.commit();
            return res.json({
                success: true,
                message: "Content already completed",
                completionPercentage: enrollment.completionPercentage
            });
        }

        // 4️⃣ Create progress record
        await UserContentProgress.create({
            userId,
            contentBlockId,
            isCompleted: true,
            completedAt: new Date()
        }, { transaction });

        // ====================================================================
        // 🚀 NEW: 4.25️⃣ Check for Badge Milestones
        // ====================================================================

        const totalCompleted = await UserContentProgress.count({
            where: { userId, isCompleted: true },
            transaction
        });

        const milestone = Math.floor(totalCompleted / 5) * 5;
        if (milestone > 0 && totalCompleted % 5 === 0) {
            let badge = await Badge.findOne({ where: { milestone }, transaction });

            if (!badge) {
                badge = await Badge.create({
                    name: `Level ${milestone} Achiever`,
                    description: `Completed ${milestone} learning milestones`,
                    milestone,
                    icon: 'award'
                }, { transaction });
            }

            const existingUserBadge = await UserBadge.findOne({
                where: { userId, badgeId: badge.id },
                transaction
            });

            if (!existingUserBadge) {
                await UserBadge.create({
                    userId,
                    badgeId: badge.id,
                    awardedAt: new Date()
                }, { transaction });

                await Notification.create({
                    userId,
                    message: `🎉 You earned the "${badge.name}" badge for completing ${milestone} learning milestones!`,
                    module: 'badge',
                    subModule: 'earned',
                    iconType: 'award',
                    metaData: { badgeId: badge.id },
                    redirectTo: ``,
                    isRead: false
                }, { transaction });
            }
        }

        // ====================================================================
        // 🚀 NEW: 4.5️⃣ Check if Subtopic is complete & Unlock Assignments
        // ====================================================================

        // Count total content blocks in this specific subtopic
        const totalContentInSubtopic = await ContentBlocks.count({
            where: { subtopicId: subtopicId },
            transaction
        });

        // Count how many content blocks the user has completed in this subtopic
        const completedContentInSubtopic = await UserContentProgress.count({
            where: { userId, isCompleted: true },
            include: [{
                model: ContentBlocks,
                where: { subtopicId: subtopicId },
                required: true
            }],
            transaction
        });

        let assignmentUnlocked = false;

        // If they match, the subtopic is fully completed!
        if (totalContentInSubtopic > 0 && totalContentInSubtopic === completedContentInSubtopic) {

            // Find any assignments linked to this subtopic
            const subtopicAssignments = await Assignments.findAll({
                where: { subtopicId: subtopicId },
                transaction
            });

            if (subtopicAssignments.length > 0) {
                // Prepare the bulk insert data
                const assignmentSubmissions = subtopicAssignments.map(assignment => ({
                    userId,
                    assignmentId: assignment.id,
                    status: 'pending', // or 'unlocked'
                    // If you have an unlockedAt timestamp, set it here:
                    // unlockedAt: new Date() 
                }));

                // Unlock them for the user
                await AssignmentSubmissions.bulkCreate(assignmentSubmissions, {
                    transaction,
                    ignoreDuplicates: true // Good practice in case of race conditions
                });

                // Create a notification per unlocked assignment
                if (req.user && req.user.id) {
                    const notifications = subtopicAssignments.map((assignment) => ({
                        userId: req.user.id,
                        message: `New assignment unlocked: ${assignment.title || 'Assignment'}`,
                        module: 'assignment',
                        subModule: 'unlock',
                        iconType: 'info',
                        metaData: { assignmentId: assignment.id },
                        redirectTo: `/assignments`,
                        isRead: false,
                    }));

                    await Notification.bulkCreate(notifications, { transaction });
                }

                assignmentUnlocked = true;
            }
        }
        // ====================================================================

        // 5️⃣ Count total content in this course
        const totalContent = await ContentBlocks.count({
            distinct: true,
            include: {
                model: Subtopics,
                include: {
                    model: CourseTopics,
                    where: { courseId }
                }
            },
            transaction
        });

        // 6️⃣ Count completed content for this user in this course
        const completedContent = await UserContentProgress.count({
            distinct: true,
            where: { userId, isCompleted: true },
            include: {
                model: ContentBlocks,
                include: {
                    model: Subtopics,
                    include: {
                        model: CourseTopics,
                        where: { courseId }
                    }
                }
            },
            transaction
        });

        const percentage = totalContent === 0
            ? 0
            : Number(((completedContent / totalContent) * 100).toFixed(2));

        // 7️⃣ Update enrollment progress
        await CourseEnrollments.update(
            {
                completionPercentage: percentage,
                lastAccessed: new Date()
            },
            {
                where: { userId, courseId },
                transaction
            }
        );

        await transaction.commit();

        return res.json({
            success: true,
            message: "Content marked completed",
            completionPercentage: percentage,
            // Send a flag to the frontend so it knows to show a notification!
            newAssignmentUnlocked: assignmentUnlocked
        });

    } catch (error) {
        await transaction.rollback();
        return res.status(500).json({ message: error.message });
    }
};

// const markContentCompleted = async (req, res) => {
//     const transaction = await db.pgConn.transaction();

//     try {
//         const { contentBlockId } = req.params;
//         const userId = req.user.id;

//         // 1️⃣ Fetch content with full hierarchy
//         const content = await ContentBlocks.findByPk(contentBlockId, {
//             include: [
//                 {
//                     model: Subtopics,
//                     include: [
//                         {
//                             model: CourseTopics,
//                             include: [
//                                 {
//                                     model: Courses,
//                                     as: 'Course' 
//                                 }
//                             ]
//                         }
//                     ]
//                 }
//             ],
//             transaction
//         });

//         if (!content) {
//             await transaction.rollback();
//             return res.status(404).json({ message: "Content not found" });
//         }

//         if (!content.Subtopic || !content.Subtopic.CourseTopic) {
//             await transaction.rollback();
//             return res.status(400).json({ message: "Invalid content hierarchy" });
//         }

//         const courseId = content.Subtopic.CourseTopic.courseId;

//         // 2️⃣ Check enrollment
//         const enrollment = await CourseEnrollments.findOne({
//             where: { userId, courseId },
//             transaction
//         });

//         if (!enrollment) {
//             await transaction.rollback();
//             return res.status(403).json({ message: "User not enrolled in this course" });
//         }

//         // 3️⃣ Prevent duplicate completion
//         const existing = await UserContentProgress.findOne({
//             where: { userId, contentBlockId },
//             transaction
//         });

//         if (existing) {
//             await transaction.commit();
//             return res.json({
//                 success: true,
//                 message: "Content already completed",
//                 completionPercentage: enrollment.completionPercentage
//             });
//         }

//         // 4️⃣ Create progress record
//         await UserContentProgress.create({
//             userId,
//             contentBlockId,
//             isCompleted: true,
//             completedAt: new Date()
//         }, { transaction });

//         // 5️⃣ Count total content in this course
//         const totalContent = await ContentBlocks.count({
//             distinct: true,
//             include: {
//                 model: Subtopics,
//                 include: {
//                     model: CourseTopics,
//                     where: { courseId }
//                 }
//             },
//             transaction
//         });

//         // 6️⃣ Count completed content for this user in this course
//         const completedContent = await UserContentProgress.count({
//             distinct: true,
//             where: { userId, isCompleted: true },
//             include: {
//                 model: ContentBlocks,
//                 include: {
//                     model: Subtopics,
//                     include: {
//                         model: CourseTopics,
//                         where: { courseId }
//                     }
//                 }
//             },
//             transaction
//         });

//         const percentage = totalContent === 0
//             ? 0
//             : Number(((completedContent / totalContent) * 100).toFixed(2));

//         // 7️⃣ Update enrollment progress
//         await CourseEnrollments.update(
//             {
//                 completionPercentage: percentage,
//                 lastAccessed: new Date()
//             },
//             {
//                 where: { userId, courseId },
//                 transaction
//             }
//         );

//         await transaction.commit();

//         return res.json({
//             success: true,
//             message: "Content marked completed",
//             completionPercentage: percentage
//         });

//     } catch (error) {
//         await transaction.rollback();
//         return res.status(500).json({ message: error.message });
//     }
// };

const checkAndReleaseAssignments = async (userId, subtopicId) => {

    // 1️⃣ Check if subtopic fully completed
    const totalBlocks = await ContentBlocks.count({
        where: { subtopicId }
    });

    const completedBlocks = await UserContentProgress.count({
        where: { userId, isCompleted: true },
        include: {
            model: ContentBlocks,
            where: { subtopicId }
        }
    });

    if (totalBlocks !== completedBlocks) return;

    // ====================================================================
    // 🚀 NEW: 4.25️⃣ Check for Badge Milestones
    // ====================================================================

    // Count total completed content for the user
    const totalCompleted = await UserContentProgress.count({
        where: { userId, isCompleted: true },
        transaction
    });

    // Check for badge milestones (every 5 completions)
    const milestone = Math.floor(totalCompleted / 5) * 5;
    if (milestone > 0 && totalCompleted % 5 === 0) {
        // Find or create the badge
        let badge = await Badge.findOne({
            where: { milestone },
            transaction
        });

        if (!badge) {
            badge = await Badge.create({
                name: `Learning Milestone ${milestone}`,
                description: `Completed ${milestone} learning milestones`,
                milestone,
                icon: 'star'
            }, { transaction });
        }

        // Check if user already has this badge
        const existingUserBadge = await UserBadge.findOne({
            where: { userId, badgeId: badge.id },
            transaction
        });

        if (!existingUserBadge) {
            // Award the badge
            await UserBadge.create({
                userId,
                badgeId: badge.id,
                awardedAt: new Date()
            }, { transaction });

            // Create notification
            await Notification.create({
                userId,
                message: `🎉 Congratulations! You've earned the "${badge.name}" badge for completing ${milestone} learning milestones.`,
                module: 'badge',
                subModule: 'earned',
                iconType: 'award',
                metaData: { badgeId: badge.id },
                redirectTo: ``,
                isRead: false
            }, { transaction });
        }
    }


    // 2️⃣ Get assignments linked to this subtopic
    const assignments = await Assignments.findAll({
        where: { subtopicId, isActive: true }
    });

    for (const assignment of assignments) {

        // 3️⃣ Prevent duplicate release
        const existing = await UserAssignmentReleases.findOne({
            where: { userId, assignmentId: assignment.id }
        });

        if (!existing) {

            await UserAssignmentReleases.create({
                userId,
                assignmentId: assignment.id
            });

            // 4️⃣ Create notification
            await Notification.create({
                userId,
                message: `Assignment "${assignment.title}" is now available.`,
                module: "assignment",
                subModule: "release",
                iconType: "info",
                metaData: { assignmentId: assignment.id },
                redirectTo: `/assignments`,
                isRead: false
            });
        }
    }
};

const getUserBadges = async (req, res) => {
    try {
        const userId = req.user.id;

        const userBadges = await UserBadge.findAll({
            where: { userId },
            include: [{
                model: Badge,
                attributes: ['id', 'name', 'description', 'milestone', 'icon']
            }],
            order: [['awardedAt', 'DESC']]
        });

        res.json({
            success: true,
            badges: userBadges
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    enrollInCourse,
    getUserCourses,
    markContentCompleted,
    getUserBadges
}

