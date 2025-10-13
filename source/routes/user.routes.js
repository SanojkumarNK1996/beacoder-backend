const router = require('express').Router();

router.get("/", (req, res) => {
    try {
        return res.status(200).json({ msg: "user fetched succesfully" })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

router.get("/profile", async (req, res) => {
    try {
        const { name } = "user"
        return res.status(200).json({ msg: "user fetched succesfully", userName: name })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

module.exports = router
