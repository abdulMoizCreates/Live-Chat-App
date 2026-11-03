require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Message = require("./models/Message");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/livechat";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_URL } });

// socket.id -> { username, room }
const online = {};

function usersIn(room) {
  const names = Object.values(online)
    .filter((u) => u.room === room)
    .map((u) => u.username);
  return [...new Set(names)];
}

function leaveRoom(socket) {
  const user = online[socket.id];
  if (!user) return;

  socket.leave(user.room);
  delete online[socket.id];

  io.to(user.room).emit("users", usersIn(user.room));
  io.to(user.room).emit("system", `${user.username} left the chat`);
}

app.get("/", (req, res) => {
  res.json({ ok: true, message: "chat server running" });
});

// handy for checking old messages without sockets
app.get("/api/messages/:room", async (req, res) => {
  try {
    const msgs = await Message.find({ room: req.params.room })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(msgs.reverse());
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "could not load messages" });
  }
});

io.on("connection", (socket) => {
  socket.on("join", async (data) => {
    const username = String(data?.username || "").trim().slice(0, 20);
    const room = String(data?.room || "general").trim().slice(0, 30);
    if (!username) return;

    leaveRoom(socket);

    online[socket.id] = { username, room };
    socket.join(room);

    try {
      const history = await Message.find({ room })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      socket.emit("history", history.reverse());
    } catch (err) {
      console.log("history error:", err.message);
      socket.emit("history", []);
    }

    io.to(room).emit("users", usersIn(room));
    socket.to(room).emit("system", `${username} joined the chat`);
  });

  socket.on("message", async (text) => {
    const user = online[socket.id];
    const clean = String(text || "").trim().slice(0, 1000);
    if (!user || !clean) return;

    let msg = {
      _id: Date.now() + "-" + socket.id,
      room: user.room,
      username: user.username,
      text: clean,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await Message.create({
        room: user.room,
        username: user.username,
        text: clean,
      });
      msg = saved.toObject();
    } catch (err) {
      console.log("save error:", err.message);
    }

    io.to(user.room).emit("message", msg);
  });

  socket.on("typing", () => {
    const user = online[socket.id];
    if (!user) return;
    socket.to(user.room).emit("typing", user.username);
  });

  socket.on("disconnect", () => {
    leaveRoom(socket);
  });
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("mongodb connected");
    server.listen(PORT, () => console.log("server on port " + PORT));
  })
  .catch((err) => {
    console.error("mongodb connection failed:", err.message);
    process.exit(1);
  });
