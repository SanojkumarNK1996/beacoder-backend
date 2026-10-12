const jwt = require("jsonwebtoken");
const Users = require("../models/Users.model");
const { JWT_SECRET } = require("../config/constants");

const getAccessRestriction = (user) => {
  const now = Date.now();
  if (user.accessStartsAt && new Date(user.accessStartsAt).getTime() > now) {
    return {
      code: "ACCESS_NOT_STARTED",
      error: "Platform access has not started yet.",
      accessStartsAt: user.accessStartsAt,
    };
  }
  if (user.accessExpiresAt && new Date(user.accessExpiresAt).getTime() <= now) {
    return {
      code: "ACCESS_EXPIRED",
      error: "Platform access has expired.",
      accessExpiresAt: user.accessExpiresAt,
    };
  }
  return null;
};

const authorize = (role) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
          return res.status(401).json({ message: "No token provided" });
        }
        req.user = jwt.verify(token, JWT_SECRET);
      }

      if (role && req.user.role !== role) {
        return res.status(403).json({ message: "Forbidden: Admins only" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized", error: error.message });
    }
  };
};

const authorizeAnyRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
  return next();
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

    const accessRestriction = getAccessRestriction(user);
    if (accessRestriction) {
      return res.status(403).json(accessRestriction);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name:user.name,
      paymentStatus: user.paymentStatus,
      showMentor: user.showMentor,
      accessStartsAt: user.accessStartsAt,
      accessExpiresAt: user.accessExpiresAt,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

module.exports = { requireAuth, authorize, authorizeAnyRole };