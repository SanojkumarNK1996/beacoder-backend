const CourseTopics = require('../models/CourseTopics.model');
const Courses = require('../models/Courses.model');

const createTopic = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Courses.findByPk(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const topic = await CourseTopics.create({ ...req.body, courseId });
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const bulkCreateTopics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { topics } = req.body;

    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Topics array is required",
      });
    }

    const course = await Courses.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Add courseId to each topic
    const topicsWithCourseId = topics.map(topic => ({
      ...topic,
      courseId
    }));

    const createdTopics = await CourseTopics.bulkCreate(topicsWithCourseId, {
      returning: true,
    });

    return res.status(201).json({
      success: true,
      message: "Topics created successfully",
      data: createdTopics,
    });
  } catch (error) {
    console.log("error", error)
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTopics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const topics = await CourseTopics.findAll({
      where: { courseId },
      order: [['displayOrder', 'ASC']],
    });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTopicById = async (req, res) => {
  try {
    const topic = await CourseTopics.findByPk(req.params.topicId);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateTopic = async (req, res) => {
  try {
    const [updated] = await CourseTopics.update(req.body, {
      where: { id: req.params.topicId },
    });
    if (!updated) return res.status(404).json({ message: 'Topic not found' });
    const updatedTopic = await CourseTopics.findByPk(req.params.topicId);
    res.json(updatedTopic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteTopic = async (req, res) => {
  try {
    const deleted = await CourseTopics.destroy({
      where: { id: req.params.topicId },
    });
    if (!deleted) return res.status(404).json({ message: 'Topic not found' });
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createTopic,
  getTopics,
  getTopicById,
  updateTopic,
  deleteTopic,
  bulkCreateTopics
}