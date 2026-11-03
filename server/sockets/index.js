const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const socketAuth = require("../middleware/socketAuth");

// find the 1-1 conversation between two users, create it if missing
async function findOrCreateConversation(a, b) {
  let conv = await Conversation.findOne({ participants: { $all: [a, b] } });
  if (!conv) conv = await Conversation.create({ participants: [a, b] });
  return conv;
}

module.exports = function registerSockets(io) {
  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const userId = String(socket.data.userId);
    socket.join(userId); // personal room named by the user's id

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    io.emit("presence", { userId, username: socket.data.username, isOnline: true });

    // data: { to: <userId>, text }
    socket.on("send_message", async (data) => {
      const to = data && data.to;
      const text = String((data && data.text) || "").trim().slice(0, 1000);
      if (!to || !text) return;

      try {
        const receiver = await User.findById(to);
        if (!receiver) return;

        const conv = await findOrCreateConversation(userId, to);
        const msg = await Message.create({
          conversation: conv._id,
          sender: userId,
          text,
        });

        conv.lastMessage = msg._id;
        await conv.save();

        // receiver online -> mark delivered right away
        if (receiver.isOnline) {
          msg.status = "delivered";
          await msg.save();
        }

        io.to(String(to)).to(userId).emit("new_message", msg.toObject());
      } catch (err) {
        console.log("send_message error:", err.message);
      }
    });

    // data: { to: <userId> }
    socket.on("typing", (data) => {
      if (!data || !data.to) return;
      io.to(String(data.to)).emit("typing", {
        from: userId,
        username: socket.data.username,
      });
    });

    socket.on("stop_typing", (data) => {
      if (!data || !data.to) return;
      io.to(String(data.to)).emit("stop_typing", { from: userId });
    });

    // data: { from: <userId> } - I have read everything `from` sent me
    socket.on("mark_read", async (data) => {
      const from = data && data.from;
      if (!from) return;

      try {
        const conv = await Conversation.findOne({
          participants: { $all: [userId, from] },
        });
        if (!conv) return;

        await Message.updateMany(
          { conversation: conv._id, sender: from, status: { $ne: "read" } },
          { $set: { status: "read" } }
        );

        const read = await Message.find({
          conversation: conv._id,
          sender: from,
          status: "read",
        })
          .select("_id")
          .lean();

        io.to(String(from)).to(userId).emit("messages_read", {
          conversation: conv._id,
          by: userId,
          messageIds: read.map((m) => m._id),
        });
      } catch (err) {
        console.log("mark_read error:", err.message);
      }
    });

    socket.on("disconnect", async () => {
      // go offline only when the user's last open tab disconnects
      const rest = await io.in(userId).fetchSockets();
      if (rest.length > 0) return;

      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
      io.emit("presence", {
        userId,
        username: socket.data.username,
        isOnline: false,
        lastSeen,
      });
    });
  });
};
