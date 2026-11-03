const router = require("express").Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const auth = require("../middleware/auth");

router.use(auth);

// GET /api/conversations - my chats, most recent activity first
router.get("/", async (req, res) => {
  try {
    const me = req.user._id;
    const convs = await Conversation.find({ participants: me })
      .populate("participants", "-password")
      .populate("lastMessage", "sender text status createdAt")
      .sort({ updatedAt: -1 });

    const result = await Promise.all(
      convs.map(async (c) => {
        const obj = c.toObject();
        obj.unreadCount = await Message.countDocuments({
          conversation: c._id,
          sender: { $ne: me },
          status: { $ne: "read" },
        });
        return obj;
      })
    );

    res.json(result);
  } catch (err) {
    console.log("conversations error:", err.message);
    res.status(500).json({ error: "could not load conversations" });
  }
});

module.exports = router;
