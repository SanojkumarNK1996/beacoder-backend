const { requireAuth } = require('../middleware/authorize');

const router = require('express').Router();

router.get("/", (req, res) => {
    try {
        return res.status(200).json({ msg: "user fetched succesfully" })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

router.get("/profile", requireAuth, async (req, res) => {
    try {
        const { name } = req.user
        return res.status(200).json({ msg: "user fetched succesfully", userName: name })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

module.exports = router
