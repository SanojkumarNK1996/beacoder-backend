const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Discussion = db.pgConn.define('Discussion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    assignmentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('open', 'closed'),
        allowNull: false,
        defaultValue: 'open',
    },
    isPairProgramming: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    bookedSlot: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    pairProgrammingStatus: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: true,
    },
}, { timestamps: true });

module.exports = Discussion;
