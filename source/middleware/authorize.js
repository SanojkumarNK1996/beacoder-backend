const jwt = require("jsonwebtoken");
const Users = require("../models/Users.model");
const { JWT_SECRET } = require("../config/constants");

const authorize = (role) => {
  return (req, res, next) => {
    try {

      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      req.user = decoded;

      if (role && req.user.role !== role) {
        return res.status(403).json({ message: "Forbidden: Admins only" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized", error: error.message });
    }
  };
};

const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "No token provided. Unauthorized." });
    }

    const decoded = await jwt.verify(token,JWT_SECRET);

    const user = await Users.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Invalid user. Unauthorized." });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name:user.name
    };

    next();
  } catch (err) {
    console.log("err",err)
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

module.exports = { requireAuth, authorize };