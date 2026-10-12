const { Op } = require('sequelize');
require('../models');
const Courses = require('../models/Courses.model');
const CourseTopics = require('../models/CourseTopics.model');
const Subtopics = require('../models/Subtopics.model');
const CareerRoadmapCourses = require('../models/CareerRoadmapCourses.model');

const curriculumInclude = [{
  model: CourseTopics,
  as: 'Topics',
  where: { isActive: true },
  required: false,
  include: [{
    model: Subtopics,
    where: { isActive: true },
    required: false,
    order: [['displayOrder', 'ASC']],
  }],
}];

const roadmapInclude = [{
  model: Courses,
  as: 'Course',
  required: true,
  include: curriculumInclude,
}];

const serializeCourse = (course) => {
  const plain = course.toJSON ? course.toJSON() : course;
  const topics = (plain.Topics || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  return {
    ...plain,
    topics: topics.map((topic) => ({
      ...topic,
      subtopics: (topic.Subtopics || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    })),
  };
};

const serializeRoadmap = (rows) => {
  const domains = [];
  const domainMap = new Map();

  rows.forEach((row) => {
    const plain = row.toJSON ? row.toJSON() : row;
    let domain = domainMap.get(plain.careerDomain);
    if (!domain) {
      domain = { name: plain.careerDomain, programs: [] };
      domainMap.set(plain.careerDomain, domain);
      domains.push(domain);
    }

    let program = domain.programs.find((item) => item.name === plain.jobReadyProgram);
    if (!program) {
      program = { name: plain.jobReadyProgram, courses: [] };
      domain.programs.push(program);
    }

    program.courses.push({
      ...serializeCourse(plain.Course),
      roadmapOrder: plain.displayOrder,
    });
  });

  return domains;
};

const fetchRoadmapRows = () => CareerRoadmapCourses.findAll({
  where: { isActive: true },
  include: roadmapInclude,
  order: [
    ['careerDomain', 'ASC'],
    ['jobReadyProgram', 'ASC'],
    ['displayOrder', 'ASC'],
  ],
});

const getCurriculum = async (req, res) => {
  try {
    const roadmap = serializeRoadmap(await fetchRoadmapRows());
    const courses = roadmap.flatMap((domain) => domain.programs.flatMap((program) => program.courses));
    const uniqueCourses = [...new Map(courses.map((course) => [course.id, course])).values()];
    res.json({ success: true, data: {
      careerDomains: roadmap,
      totals: {
        careerDomains: roadmap.length,
        programs: roadmap.reduce((total, domain) => total + domain.programs.length, 0),
        courses: uniqueCourses.length,
        topics: uniqueCourses.reduce((total, course) => total + course.topics.length, 0),
        subtopics: uniqueCourses.reduce((total, course) => total + course.topics.reduce((count, topic) => count + topic.subtopics.length, 0), 0),
      },
    } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStream = async (req, res) => {
  try {
    const courses = await Courses.findAll({
      where: { isActive: true, stream: req.params.stream },
      include: curriculumInclude,
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
    res.json({ success: true, data: { name: req.params.stream, courses: courses.map(serializeCourse) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const searchCurriculum = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) return res.json({ success: true, data: [] });
    const courses = await Courses.findAll({
      where: { isActive: true, [Op.or]: [
        { courseName: { [Op.iLike]: `%${query}%` } },
        { stream: { [Op.iLike]: `%${query}%` } },
        { '$Topics.title$': { [Op.iLike]: `%${query}%` } },
        { '$Topics.Subtopics.title$': { [Op.iLike]: `%${query}%` } },
      ] },
      include: curriculumInclude,
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
      limit: 30,
    });
    const results = courses.map(serializeCourse).flatMap((course) => [
      ...(course.courseName.toLowerCase().includes(query.toLowerCase()) || course.stream?.toLowerCase().includes(query.toLowerCase()) ? [{ type: 'course', id: course.id, name: course.courseName, stream: course.stream, course }] : []),
      ...course.topics.flatMap((topic) => topic.title.toLowerCase().includes(query.toLowerCase()) ? [{ type: 'topic', id: topic.id, name: topic.title, courseId: course.id, course }] : []),
      ...course.topics.flatMap((topic) => topic.subtopics.filter((subtopic) => subtopic.title.toLowerCase().includes(query.toLowerCase())).map((subtopic) => ({ type: 'subtopic', id: subtopic.id, name: subtopic.title, courseId: course.id, course }))),
    ]);
    res.json({ success: true, data: results.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRoadmap = async (req, res) => {
  try {
    res.json({ success: true, data: serializeRoadmap(await fetchRoadmapRows()) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCurriculum, getStream, searchCurriculum, getRoadmap };
