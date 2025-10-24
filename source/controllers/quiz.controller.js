const Quiz = require('../models/Quiz.model.js');
const CourseTopics = require('../models/CourseTopics.model');
const QuizSubmission = require("../models/QuizSubmission.model")
const Users = require("../models/Users.model")

const createTopicQuiz = async (req, res) => {
    try {
        const { courseId, topicId } = req.params;
        const { tags, questionData, title, displayOrder } = req.body;


        const topic = await CourseTopics.findOne({ where: { id: topicId, courseId } });
        if (!topic) {
            return res.status(404).json({ message: "Topic not found for this course" });
        }

        const quiz = await Quiz.create({
            courseId,
            topicId,
            tags,
            questionData,
            title,
            displayOrder
        });

        res.status(201).json({ message: "Topic-level quiz created successfully", quiz });
    } catch (error) {
        console.error("Error creating quiz:", error);
        res.status(500).json({ message: "Failed to create quiz" });
    }
};

const updateQuiz = async (req, res) => {
    try {
        const { courseId, topicId, quizId } = req.params;
        const { tags, questionData, isActive } = req.body;

        const quiz = await Quiz.findOne({ where: { id: quizId, courseId, topicId } });
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        quiz.tags = tags ?? quiz.tags;
        quiz.questionData = questionData ?? quiz.questionData;
        quiz.isActive = isActive ?? quiz.isActive;

        await quiz.save();

        res.status(200).json({ message: "Quiz updated successfully", quiz });
    } catch (error) {
        console.error("Error updating quiz:", error);
        res.status(500).json({ message: "Failed to update quiz" });
    }
};

const deleteQuiz = async (req, res) => {
    try {
        const { courseId, topicId, quizId } = req.params;

        const deleted = await Quiz.destroy({ where: { id: quizId, courseId, topicId } });

        if (!deleted) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        res.status(200).json({ message: "Quiz deleted successfully" });
    } catch (error) {
        console.error("Error deleting quiz:", error);
        res.status(500).json({ message: "Failed to delete quiz" });
    }
};

const getQuizzesByTopic = async (req, res) => {
    try {
        const { courseId, topicId } = req.params;

        const quizzes = await Quiz.findAll({
            where: { courseId, topicId },
          order: [['displayOrder', 'ASC']],
        });
        res.status(200).json({ message: "Quiz fetched successfully", quizzes });

    } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).json({ message: "Failed to fetch quizzes" });
    }
};

const submitTopicQuiz = async (req, res) => {
    try {
        const { topicId, quizId } = req.params;
        const { answers } = req.body;
        const { id } = req.user;


        const quiz = await Quiz.findOne({ where: { id: quizId, topicId, isActive: true } });
        if (!quiz) return res.status(404).json({ message: "Quiz not found for this topic" });


        if (!answers || !Array.isArray(answers) || answers.length !== quiz.questionData.length) {
            return res.status(400).json({
                message: `Invalid answers. Expected ${quiz.questionData.length} answers in an array.`
            });
        }

        // Calculate score
        let score = 0;
        quiz.questionData.forEach((q, idx) => {
            if (answers[idx] && answers[idx] === q.answer) score++;
        });


        const submission = await QuizSubmission.create({
            userId: id,
            quizId,
            answers,
            score
        });

        res.status(201).json({
            message: "Quiz submitted successfully",
            quizId,
            topicId,
            totalQuestions: quiz.questionData.length,
            score,
            submission
        });
    } catch (err) {
        res.status(500).json({
            message: "Failed to submit quiz",
            error: err.message
        });
    }
};

// GET single quiz result in a topic
const getSingleQuizResultForTopic = async (req, res) => {
    try {
        const { courseId, topicId, quizId } = req.params;
        const { id } = req.user;

        const result = await QuizSubmission.findOne({
            where: { userId: id, quizId },
            include: [{ model: Quiz, where: { id: quizId, topicId, courseId } }],
            order: [['createdAt', 'DESC']]
        });

        if (!result)
            return res.status(404).json({ message: 'No result found for this quiz' });

        res.status(200).json({
            message: 'Quiz result fetched successfully',
            quizId,
            topicId,
            courseId,
            score: result.score,
            totalQuestions: result.answers.length,
            submittedAt: result.submittedAt,
            answers: result.answers
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch quiz result', error: err.message });
    }
};

// GET topic wise quiz result
const getTopicQuizPerformance = async (req, res) => {
    try {
        const { courseId, topicId } = req.params;
        const { id } = req.user;

        // Fetch all quizzes in the topic
        const quizzes = await Quiz.findAll({ where: { courseId, topicId } });
        if (!quizzes.length)
            return res.status(404).json({ message: 'No quizzes found for this topic' });

        const quizIds = quizzes.map(q => q.id);

        // Fetch all submissions of this user for these quizzes
        const submissions = await QuizSubmission.findAll({
            where: { userId: id, quizId: quizIds },
            order: [['createdAt', 'DESC']]
        });

        // Calculate performance
        let totalScore = 0;
        let totalQuestions = 0;

        const quizResults = quizzes.map(q => {
            const sub = submissions.find(s => s.quizId === q.id);
            const score = sub ? sub.score : 0;
            totalScore += score;
            totalQuestions += q.questionData.length;

            return {
                quizId: q.id,
                tags: q.tags,
                score,
                totalQuestions: q.questionData.length,
                submittedAt: sub ? sub.submittedAt : null
            };
        });

        const avgScore = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

        res.status(200).json({
            message: 'Topic quiz performance fetched successfully',
            topicId,
            totalQuizzes: quizzes.length,
            attemptedQuizzes: submissions.length,
            totalScore,
            totalQuestions,
            avgScore,
            quizResults
        });
    } catch (err) {
        res.status(500).json({
            message: 'Failed to fetch topic quiz performance',
            error: err.message
        });
    }
};

// GET course wise quiz result
const getUserQuizResults = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { id } = req.user;

        const results = await QuizSubmission.findAll({
            where: { userId: id },
            include: [{
                model: Quiz,
                where: { courseId },
                include: [{ model: CourseTopics, attributes: ['id', 'title'] }]
            }],
            order: [['createdAt', 'DESC']]
        });

        if (!results.length)
            return res.status(404).json({ message: 'No quiz results found for this course' });

        // Map results for clarity
        const mappedResults = results.map(r => ({
            quizId: r.quizId,
            quizTags: r.Quiz.tags,            // quiz name/tags
            topicId: r.Quiz.topicId,
            topicTitle: r.Quiz.CourseTopic?.title, // needs Quiz.belongsTo(CourseTopics)
            score: r.score,
            totalQuestions: r.answers.length,
            submittedAt: r.submittedAt
        }));

        res.status(200).json({
            message: 'All quiz results for course fetched successfully',
            courseId,
            results: mappedResults
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch course quiz results', error: err.message });
    }
};

const getTopicQuizSubmissions = async (req, res) => {
    try {
        const { topicId } = req.params;

        if (!topicId) {
            return res.status(400).json({ message: "Topic ID is required" });
        }

        // Fetch topic
        const topic = await CourseTopics.findByPk(topicId, {
            attributes: ['id', 'title'],
        });

        if (!topic) {
            return res.status(404).json({ message: "Topic not found" });
        }

        // Fetch all submissions for quizzes under this topic
        const submissions = await QuizSubmission.findAll({
            include: [
                {
                    model: Quiz,
                    attributes: ['id', 'tags', 'topicId'],
                    where: { topicId },
                },
                {
                    model: Users,
                    attributes: ['id', 'name', 'email'],
                }
            ],
            order: [['score', 'DESC']], // for easy top scorer calc
        });

        if (!submissions.length) {
            return res.status(200).json({
                message: "No quiz submissions found for this topic",
                topicId,
                topicTitle: topic.title,
                totalSubmissions: 0,
                averageScore: 0,
                studentsAttempted: 0,
                topScorers: [],
                submissions: []
            });
        }

        // ✅ Calculate stats
        const totalScore = submissions.reduce((sum, s) => sum + s.score, 0);
        const avgScore = totalScore / submissions.length;

        // ✅ Unique student count
        const studentsAttempted = new Set(submissions.map(s => s.User.id)).size;

        // ✅ Top scorers (highest score)
        const highestScore = submissions[0].score; // because sorted DESC
        const topScorers = submissions
            .filter(s => s.score === highestScore)
            .map(s => ({
                userId: s.User.id,
                name: s.User.name,
                email: s.User.email,
                score: s.score,
                submissionId: s.id,
            }));

        // ✅ Format response
        const formatted = submissions.map(s => ({
            submissionId: s.id,
            quizId: s.Quiz.id,
            quizTags: s.Quiz.tags,
            user: {
                id: s.User.id,
                name: s.User.name,
                email: s.User.email,
            },
            score: s.score,
            totalQuestions: s.totalQuestions,
            submittedAt: s.createdAt,
        }));

        return res.status(200).json({
            message: "Quiz submissions fetched successfully",
            topicId: topic.id,
            topicTitle: topic.title,
            totalSubmissions: submissions.length,
            averageScore: avgScore.toFixed(2),
            studentsAttempted,
            topScorers,
            submissions: formatted,
        });

    } catch (error) {
        console.error("Error fetching topic quiz submissions:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createTopicQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizzesByTopic,
    submitTopicQuiz,
    getSingleQuizResultForTopic,
    getUserQuizResults,
    getTopicQuizPerformance,
    getTopicQuizSubmissions
}