const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

function makeToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// passwords must never leave the server, even hashed
function cleanUser(user) {
  const u = user.toObject();
  delete u.password;
  return u;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const username = String((req.body && req.body.username) || "").trim();
    const password = String((req.body && req.body.password) || "");

    if (username.length < 3 || password.length < 6) {
      return res
        .status(400)
        .json({ error: "username needs 3+ chars and password needs 6+ chars" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash });

    res.status(201).json({ token: makeToken(user), user: cleanUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "username already taken" });
    }
    console.log("register error:", err.message);
    res.status(500).json({ error: "could not register" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const username = String((req.body && req.body.username) || "").trim();
    const password = String((req.body && req.body.password) || "");

    const user = await User.findOne({ username }).select("+password");
    if (!user) return res.status(401).json({ error: "wrong username or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "wrong username or password" });

    await User.findByIdAndUpdate(user._id, { lastSeen: new Date() });
    res.json({ token: makeToken(user), user: cleanUser(user) });
  } catch (err) {
    console.log("login error:", err.message);
    res.status(500).json({ error: "could not log in" });
  }
});

// GET /api/auth/me
router.get("/me", auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
