const UserNotes = require('../models/UserNotes.model');

const createOrUpdateNote = async (req, res) => {
  try {
    const { topicId, subtopicId, notes } = req.body;
    const userId = req.user.id;

    // Check if note already exists
    let userNote = await UserNotes.findOne({
      where: { userId, topicId, subtopicId }
    });

    if (userNote) {
      // Update existing note
      userNote.notes = notes;
      await userNote.save();
      return res.status(200).json({ success: true, message: 'Note updated successfully', data: userNote });
    } else {
      // Create new note
      userNote = await UserNotes.create({
        userId,
        topicId,
        subtopicId,
        notes
      });
      return res.status(201).json({ success: true, message: 'Note created successfully', data: userNote });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNote = async (req, res) => {
  try {
    const { topicId, subtopicId } = req.params;
    const userId = req.user.id;

    const userNote = await UserNotes.findOne({
      where: { userId, topicId, subtopicId }
    });

    if (!userNote) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.status(200).json({ success: true, data: userNote });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotesByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user.id;

    const userNotes = await UserNotes.findAll({
      where: { userId, topicId },
      attributes: ['id', 'notes'],
      include: [
        {
          model: require('../models/Subtopics.model'),
          attributes: ['title']
        }
      ]
    });

    const formattedNotes = userNotes.map(note => ({
      id: note.id,
      subtopic: note.Subtopic.title,
      notes: note.notes
    }));

    res.status(200).json({ success: true, data: formattedNotes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrUpdateNote,
  getNote,
  getNotesByTopic
};