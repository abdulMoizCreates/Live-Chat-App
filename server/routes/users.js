const router = require("express").Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

router.use(auth);

// GET /api/users?search=ali  (everyone except me)
router.get("/", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const filter = { _id: { $ne: req.user._id } };

    if (search) {
      // escape regex chars so a name like "a.b" can't break the query
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.username = { $regex: safe, $options: "i" };
    }

    const users = await User.find(filter)
      .sort({ username: 1 })
      .select("-password");
    res.json(users);
  } catch (err) {
    console.log("users error:", err.message);
    res.status(500).json({ error: "could not load users" });
  }
});

module.exports = router;
