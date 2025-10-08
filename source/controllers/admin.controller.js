const bcrypt = require("bcrypt")
const { PASSWORD_HASH_SALT } = require("../config/constants");
const Users = require("../models/Users.model")

const createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const hashedPassword = await bcrypt.hash(password, PASSWORD_HASH_SALT);

    const admin = await Users.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      paymentStatus: 'paid',
    });

    return res.status(201).json({ message: "Admin created successfully", admin });
  } catch (err) {

    if (err.name === "SequelizeUniqueConstraintError") {
      const field = err.errors[0].path;
      const message = `${field} must be unique`;

      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: err.message });
  }
}

const conformPayment = async (req, res) => {
  try {
    const { emails } = req.body;


    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Emails array is required",
      });
    }

    const result = await Users.update(
      { isActive: true, paymentStatus: "paid" },
      {
        where: {
          email: emails,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Payment confirmed and users updated",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });

  } catch (err) {
    console.error("Payment confirmation error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while confirming payment",
    });
  }
}

module.exports = { createAdmin, conformPayment }