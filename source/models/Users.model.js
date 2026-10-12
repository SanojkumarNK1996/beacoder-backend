const { DataTypes } = require('sequelize');
const db = require('../config/db');


const Users = db.pgConn.define('Users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
  },
  officeCollege: {
    type: DataTypes.STRING,
  },  
  phone: {
    type: DataTypes.STRING,
    unique: true,
  },
  role: {
    type: DataTypes.ENUM('student', 'instructor', 'partner', 'admin'),
    allowNull: false,
    defaultValue: 'student',
  },
  tag: {
    type: DataTypes.ENUM('CUSTOMER', 'COMPANY'),
    allowNull: false,
    defaultValue: 'COMPANY',
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  showMentor: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  lastLogin: {
    type: DataTypes.DATE,
  },
  accessStartsAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  accessExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  paymentStatus: {
  type: DataTypes.ENUM('pending', 'paid', 'premium', 'failed', 'refunded', 'expired'),
  allowNull: false,
  defaultValue: 'pending',
},
}, { timestamps: true });


module.exports = Users;