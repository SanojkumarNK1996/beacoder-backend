const Users = require("./Users.model");
const Courses = require("./Courses.model");
const CourseEnrollments = require("./CourseEnrollments.model");
const CourseTopics = require("./CourseTopics.model");    // Topics Table
const Subtopics = require("./Subtopics.model");
const ContentBlocks = require("./ContentTable.model");
const Quiz = require("./Quiz.model");
const QuizSubmission = require('./QuizSubmission.model');


Users.hasMany(Courses, { foreignKey: "instructorId" });
Courses.belongsTo(Users, { as: "Instructor", foreignKey: "instructorId" });

Users.hasMany(CourseEnrollments, { foreignKey: "userId" });
CourseEnrollments.belongsTo(Users, { foreignKey: "userId" });

Courses.hasMany(CourseEnrollments, { foreignKey: "courseId" });
CourseEnrollments.belongsTo(Courses, { foreignKey: "courseId" });

Courses.hasMany(CourseTopics, {
  as: 'Topics',
  foreignKey: { name: 'courseId', allowNull: false },
  onDelete: 'CASCADE',
});
CourseTopics.belongsTo(Courses, {
  as: 'Course',
  foreignKey: { name: 'courseId', allowNull: false },
  onDelete: 'CASCADE',
});

CourseTopics.hasMany(Subtopics, { foreignKey: 'topicId' });
Subtopics.belongsTo(CourseTopics, { foreignKey: 'topicId' });

Subtopics.hasMany(ContentBlocks, { foreignKey: "subtopicId", onDelete: "CASCADE" });
ContentBlocks.belongsTo(Subtopics, { foreignKey: "subtopicId" });

//quiz
Courses.hasMany(Quiz, { foreignKey: 'courseId' });
Quiz.belongsTo(Courses, { foreignKey: 'courseId' });

CourseTopics.hasMany(Quiz, {
  foreignKey: 'topicId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Quiz.belongsTo(CourseTopics, {
  foreignKey: 'topicId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// ✅ content-level quizzes
ContentBlocks.hasMany(Quiz, {
  foreignKey: 'contentBlockId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Quiz.belongsTo(ContentBlocks, {
  foreignKey: 'contentBlockId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
// Subtopics.hasMany(Quiz, { foreignKey: 'subtopicId' });
// Quiz.belongsTo(Subtopics, { foreignKey: 'subtopicId' });

// Courses.hasMany(Assignments, { foreignKey: 'courseId' });
// Assignments.belongsTo(Courses, { foreignKey: 'courseId' });

// QuizSubmission
Users.hasMany(QuizSubmission, { foreignKey: 'userId' });
QuizSubmission.belongsTo(Users, { foreignKey: 'userId' });

Quiz.hasMany(QuizSubmission, { foreignKey: 'quizId' });
QuizSubmission.belongsTo(Quiz, { foreignKey: 'quizId' });