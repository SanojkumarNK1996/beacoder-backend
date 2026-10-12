const Courses = require("../models/Courses.model");
const CourseTopics = require("../models/CourseTopics.model");
const Subtopics = require("../models/Subtopics.model");
const ContentBlocks = require("../models/ContentTable.model");
const sanitizeLessonHtml = require("../utils/sanitizeLessonHtml");

const getCourses = async (req, res) => {
  try {
    const courses = await Courses.findAll({
      attributes: ["id", "courseKey", "courseName", "isActive"],
      order: [["displayOrder", "ASC"], ["id", "ASC"]],
    });
    return res.json({ success: true, data: courses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getTopics = async (req, res) => {
  try {
    const course = await Courses.findByPk(req.params.courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    const topics = await CourseTopics.findAll({
      where: { courseId: req.params.courseId },
      attributes: ["id", "title", "displayOrder"],
      order: [["displayOrder", "ASC"], ["id", "ASC"]],
    });
    return res.json({ success: true, data: topics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSubtopics = async (req, res) => {
  try {
    const topic = await CourseTopics.findOne({
      where: { id: req.params.topicId, courseId: req.params.courseId },
    });
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
    const subtopics = await Subtopics.findAll({
      where: { topicId: req.params.topicId },
      attributes: ["id", "title", "displayOrder"],
      order: [["displayOrder", "ASC"], ["id", "ASC"]],
    });
    return res.json({ success: true, data: subtopics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const findSubtopic = async (courseId, topicId, subtopicId) => {
  const topic = await CourseTopics.findOne({ where: { id: topicId, courseId } });
  if (!topic) return { error: "Topic not found" };
  const subtopic = await Subtopics.findOne({ where: { id: subtopicId, topicId } });
  return subtopic ? { subtopic } : { error: "Subtopic not found" };
};

const serializeBlock = (block) => {
  const plain = block.toJSON ? block.toJSON() : { ...block };
  if (typeof plain.data?.description === "string") {
    plain.data = {
      ...plain.data,
      description: sanitizeLessonHtml(plain.data.description),
    };
  }
  return plain;
};

const getContentBlocks = async (req, res) => {
  try {
    const { courseId, topicId, subtopicId } = req.params;
    const result = await findSubtopic(courseId, topicId, subtopicId);
    if (!result.subtopic) {
      return res.status(404).json({ success: false, message: result.error });
    }

    const blocks = await ContentBlocks.findAll({
      where: { subtopicId, dataType: "notes" },
      attributes: ["id", "displayOrder", "dataType", "title", "data"],
      order: [["displayOrder", "ASC"], ["id", "ASC"]],
    });
    const data = blocks.map(serializeBlock);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateContentBlock = async (req, res) => {
  try {
    const { courseId, topicId, subtopicId, contentId } = req.params;
    if (
      !req.body
      || Object.keys(req.body).length !== 1
      || typeof req.body.description !== "string"
      || Buffer.byteLength(JSON.stringify(req.body), "utf8") > 1024 * 1024
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide only a description string (maximum 1 MB).",
      });
    }

    const result = await findSubtopic(courseId, topicId, subtopicId);
    if (!result.subtopic) {
      return res.status(404).json({ success: false, message: result.error });
    }
    const block = await ContentBlocks.findOne({
      where: { id: contentId, subtopicId, dataType: "notes" },
    });
    if (!block) return res.status(404).json({ success: false, message: "Editable content block not found" });

    const data = {
      ...(block.data || {}),
      description: sanitizeLessonHtml(req.body.description),
    };
    await block.update({ data });
    return res.json({ success: true, message: "Content saved successfully", data: block });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCourses, getTopics, getSubtopics, getContentBlocks, updateContentBlock };
