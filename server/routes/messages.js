const router = require("express").Router();
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const auth = require("../middleware/auth");

router.use(auth);

// GET /api/messages/:userId - history with that user, paginated (?page=1&limit=30)
router.get("/:userId", async (req, res) => {
  try {
    const otherId = req.params.userId;
    if (!mongoose.isValidObjectId(otherId)) {
      return res.status(400).json({ error: "invalid user id" });
    }

    const conv = await Conversation.findOne({
      participants: { $all: [req.user._id, otherId] },
    });
    if (!conv) return res.json({ messages: [], page: 1, hasMore: false });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));

    const total = await Message.countDocuments({ conversation: conv._id });
    const messages = await Message.find({ conversation: conv._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ messages: messages.reverse(), page, hasMore: page * limit < total });
  } catch (err) {
    console.log("messages error:", err.message);
    res.status(500).json({ error: "could not load messages" });
  }
});

module.exports = router;
