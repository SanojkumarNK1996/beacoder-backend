const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken');
const { PASSWORD_HASH_SALT, JWT_SECRET } = require("../config/constants");
const Users = require("../models/Users.model")


const SignUp = async (req, res) => {
    try {
        const { name, email, phone, password, address, officeCollege } = req.body;

        const existingUser = await Users.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ msg: 'Email already registered' });
        }

        const existingPhone = await Users.findOne({ where: { phone } });
        if (existingPhone) {
            return res.status(400).json({ msg: 'Phone Number already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, PASSWORD_HASH_SALT);

        const user = await Users.create({
            name,
            email,
            phone,
            password: hashedPassword,
            address,
            officeCollege,
            role: "student",
            tag: 'CUSTOMER',
        });

        return res.status(201).json({ msg: 'User registered successfully', user });
    } catch (err) {

        if (err.name === "SequelizeUniqueConstraintError") {
            const field = err.errors[0].path;
            const message = `${field} must be unique`;

            return res.status(400).json({ error: message });
        }
        return res.status(500).json({ error: err.message });
    }
}

const Login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await Users.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        if (!user.isActive) {
            return res.status(400).json({ msg: 'user account not activated.contact admin' });
        }

        const now = Date.now();
        if (user.accessStartsAt && new Date(user.accessStartsAt).getTime() > now) {
            return res.status(403).json({
                code: "ACCESS_NOT_STARTED",
                msg: "Platform access has not started yet. Please contact an administrator.",
                accessStartsAt: user.accessStartsAt,
            });
        }
        if (user.accessExpiresAt && new Date(user.accessExpiresAt).getTime() <= now) {
            return res.status(403).json({
                code: "ACCESS_EXPIRED",
                msg: "Platform access has expired. Please contact an administrator.",
                accessExpiresAt: user.accessExpiresAt,
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });


        await user.update({ lastLogin: new Date() });

        return res.status(200).json({
            msg: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            role: user.role
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

module.exports = {
    SignUp,
    Login
}