const MentorProfile = require("../models/MentorProfile.model");
const Users = require("../models/Users.model");

const getActiveMentors = async (req, res) => {
  try {
    const mentors = await MentorProfile.findAll({
      where: { profileStatus: "Active", visibility: "yes" },
      attributes: [
        "professionalTitle",
        "state",
        "district",
        "currentCompany",
        "previousCompanies",
        "totalExperience",
        "linkedinUrl",
        "imageUrl",
        "profileStatus",
        "visibility",
        "motherTongue",
        "languagesKnown",
        "technologiesKnown",
      ],
      include: [{
        model: Users,
        as: "user",
        attributes: ["id", "name"],
        where: { role: "instructor", isActive: true },
        required: true,
      }],
      order: [[{ model: Users, as: "user" }, "name", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: mentors.map((mentor) => mentor.get({ plain: true })),
    });
  } catch (error) {
    console.error("Unable to load active mentors:", error);
    return res.status(500).json({ success: false, message: "Unable to load mentors" });
  }
};

module.exports = { getActiveMentors };
