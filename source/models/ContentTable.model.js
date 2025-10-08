const { DataTypes } = require('sequelize');
const db = require('../config/db');

const ContentBlocks = db.pgConn.define("ContentBlocks", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    dataType: {
        type: DataTypes.ENUM(
            "youtube_video",
            "notes",
            "mcq_set",
            "interview_questions",
            "programming_assignment",
            "github_project",
            "user_notes_section"
        ),
        allowNull: false,
        defaultValue: "youtube_video",
    },
    title: {
        type: DataTypes.STRING(300),
        allowNull: true,
    },
    data: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
},
    {
        timestamps: true,
    }
);

module.exports = ContentBlocks;