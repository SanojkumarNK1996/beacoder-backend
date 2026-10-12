const Users = require("./Users.model");
const MentorProfile = require("./MentorProfile.model");
const Courses = require("./Courses.model");
const CourseEnrollments = require("./CourseEnrollments.model");
const CourseTopics = require("./CourseTopics.model");    // Topics Table
const Subtopics = require("./Subtopics.model");
const ContentBlocks = require("./ContentTable.model");
const UserSubtopicReview = require("./UserSubtopicReview.model");
const Assignments = require('./Assignment.model');
const UserAssignments = require('./UserAssignments.model');
const Notification = require('./Notification.model');
const Discussion = require('./Discussion.model');
const CareerRoadmapCourses = require('./CareerRoadmapCourses.model');
const Recruiter = require('./Recruiter.model');
const QuizQuestions = require('./QuizQuestion.model');
const StudentProgress = require('./StudentProgress.model');
const StudentActivity = require('./StudentActivity.model');
const Tests = require('./Tests.model');
const UserTestResults = require('./UserTestResults.model');


Users.hasMany(Courses, { foreignKey: "instructorId" });
Courses.belongsTo(Users, { as: "Instructor", foreignKey: "instructorId" });

Users.hasOne(MentorProfile, {
  as: "mentorProfile",
  foreignKey: { name: "userId", allowNull: false, unique: true },
  onDelete: "CASCADE",
});
MentorProfile.belongsTo(Users, {
  as: "user",
  foreignKey: { name: "userId", allowNull: false, unique: true },
});

Users.hasMany(Recruiter, { as: "recruiters", foreignKey: "createdBy", onDelete: "CASCADE" });
Recruiter.belongsTo(Users, { as: "creator", foreignKey: "createdBy" });

Users.hasMany(CourseEnrollments, { foreignKey: "userId" });
CourseEnrollments.belongsTo(Users, { foreignKey: "userId" });

Users.hasOne(StudentProgress, { as: 'studentProgress', foreignKey: 'studentId', onDelete: 'CASCADE' });
StudentProgress.belongsTo(Users, { as: 'student', foreignKey: 'studentId' });

Users.hasMany(StudentActivity, { as: 'studentActivities', foreignKey: 'studentId', onDelete: 'CASCADE' });
StudentActivity.belongsTo(Users, { as: 'student', foreignKey: 'studentId' });
Users.hasMany(StudentActivity, { as: 'recordedStudentActivities', foreignKey: 'recordedById' });
StudentActivity.belongsTo(Users, { as: 'recorder', foreignKey: 'recordedById' });

Users.hasMany(Tests, { as: 'createdTests', foreignKey: 'createdBy' });
Tests.belongsTo(Users, { as: 'creator', foreignKey: 'createdBy' });
Tests.hasMany(UserTestResults, { as: 'userResults', foreignKey: 'testId' });
UserTestResults.belongsTo(Tests, { as: 'test', foreignKey: 'testId' });
Users.hasMany(UserTestResults, { as: 'testResults', foreignKey: 'userId' });
UserTestResults.belongsTo(Users, { as: 'user', foreignKey: 'userId' });
UserTestResults.belongsTo(Users, { as: 'assignedBy', foreignKey: 'assignedById' });

Courses.hasMany(CourseEnrollments, { foreignKey: "courseId" });
CourseEnrollments.belongsTo(Courses, { foreignKey: "courseId" });

Courses.hasMany(CareerRoadmapCourses, { foreignKey: 'courseId', onDelete: 'CASCADE' });
CareerRoadmapCourses.belongsTo(Courses, { as: 'Course', foreignKey: 'courseId', onDelete: 'CASCADE' });

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

QuizQuestions.belongsTo(Subtopics, {
  as: 'Subtopic',
  foreignKey: 'subtopicKey',
  targetKey: 'subtopicKey',
});
Subtopics.hasMany(QuizQuestions, {
  as: 'QuizQuestions',
  foreignKey: 'subtopicKey',
  sourceKey: 'subtopicKey',
});

// One review selection per user and subtopic.
Users.hasMany(UserSubtopicReview, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserSubtopicReview.belongsTo(Users, { foreignKey: 'userId', onDelete: 'CASCADE' });
Subtopics.hasMany(UserSubtopicReview, { foreignKey: 'subtopicId', onDelete: 'CASCADE' });
UserSubtopicReview.belongsTo(Subtopics, { foreignKey: 'subtopicId', onDelete: 'CASCADE' });

// Assignment curriculum link: one stable, database-enforced subtopic key.
Assignments.belongsTo(Subtopics, {
  as: 'Subtopic',
  foreignKey: 'subtopicKey',
  targetKey: 'subtopicKey',
});
Subtopics.hasMany(Assignments, {
  as: 'Assignments',
  foreignKey: 'subtopicKey',
  sourceKey: 'subtopicKey',
});

// User assignments
UserAssignments.belongsTo(Assignments, { as: 'Assignment', foreignKey: 'assignmentId' });
Assignments.hasMany(UserAssignments, { as: 'UserAssignments', foreignKey: 'assignmentId' });

UserAssignments.belongsTo(Users, { as: 'User', foreignKey: 'userId' });
Users.hasMany(UserAssignments, { as: 'UserAssignments', foreignKey: 'userId' });

UserAssignments.belongsTo(Users, { as: 'AssignedBy', foreignKey: 'assignedById' });

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
