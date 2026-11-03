const jwt = require("jsonwebtoken");
const User = require("../models/User");

// REST guard: expects "Authorization: Bearer <token>"
module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "not logged in" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ error: "not logged in" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }
};
