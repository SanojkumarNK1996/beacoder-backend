const Users = require("./Users.model");
const Courses = require("./Courses.model");
const CourseEnrollments = require("./CourseEnrollments.model");
const CourseTopics = require("./CourseTopics.model");    // Topics Table
const Subtopics = require("./Subtopics.model");
const ContentBlocks = require("./ContentTable.model");
const Quiz = require("./Quiz.model");
const QuizSubmission = require('./QuizSubmission.model');
const UserContentProgress = require("./UserContentProgress.model");
const Assignments = require('./Assignment.model');
const AssignmentSubmissions = require('./AssignmentSubmission.model');
const Notification = require('./Notification.model');
const Badge = require('./Badge.model');
const UserBadge = require('./UserBadge.model');
const Discussion = require('./Discussion.model');


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

// user progress
ContentBlocks.hasMany(UserContentProgress, { foreignKey: 'contentBlockId' });
UserContentProgress.belongsTo(ContentBlocks, { foreignKey: 'contentBlockId' });

Users.hasMany(UserContentProgress, { foreignKey: 'userId' });
UserContentProgress.belongsTo(Users, { foreignKey: 'userId' });

// Assignment
Assignments.belongsTo(Courses, { foreignKey: 'courseId' });
Courses.hasMany(Assignments, { foreignKey: 'courseId' });

// Optional Topic
Assignments.belongsTo(CourseTopics, { foreignKey: 'topicId' });
CourseTopics.hasMany(Assignments, { foreignKey: 'topicId' });

// Optional Subtopic
Assignments.belongsTo(Subtopics, { foreignKey: 'subtopicId' });
Subtopics.hasMany(Assignments, { foreignKey: 'subtopicId' });

// Submissions
AssignmentSubmissions.belongsTo(Assignments, { foreignKey: 'assignmentId' });
Assignments.hasMany(AssignmentSubmissions, { foreignKey: 'assignmentId' });

AssignmentSubmissions.belongsTo(Users, { foreignKey: 'userId' });
Users.hasMany(AssignmentSubmissions, { foreignKey: 'userId' });

// Notification
Notification.belongsTo(Users, { foreignKey: 'userId' });
Users.hasMany(Notification, { foreignKey: 'userId' });

const DiscussionReply = require('./DiscussionReply.model');

// Discussion system
Discussion.belongsTo(Users, { foreignKey: 'userId' });
Users.hasMany(Discussion, { foreignKey: 'userId' });

Discussion.belongsTo(Courses, { foreignKey: 'courseId' });
Courses.hasMany(Discussion, { foreignKey: 'courseId' });

Discussion.belongsTo(Assignments, { as: 'Assignment', foreignKey: 'assignmentId' });
Assignments.hasMany(Discussion, { as: 'Discussions', foreignKey: 'assignmentId' });

Discussion.hasMany(DiscussionReply, { foreignKey: 'discussionId' });
DiscussionReply.belongsTo(Discussion, { foreignKey: 'discussionId' });

DiscussionReply.belongsTo(Users, { foreignKey: 'userId' });
Users.hasMany(DiscussionReply, { foreignKey: 'userId' });

// Badge system
Badge.hasMany(UserBadge, { foreignKey: 'badgeId' });
UserBadge.belongsTo(Badge, { foreignKey: 'badgeId' });

Users.hasMany(UserBadge, { foreignKey: 'userId' });
UserBadge.belongsTo(Users, { foreignKey: 'userId' });