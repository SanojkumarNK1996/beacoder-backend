const Users = require("./Users.model");
const Courses = require("./Courses.model");
const CourseEnrollments = require("./CourseEnrollments.model");
const CourseTopics = require("./CourseTopics.model");    // Topics Table
const Subtopics = require("./Subtopics.model");
const ContentBlocks = require("./ContentTable.model");          


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