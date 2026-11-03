require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/livechat";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in server/.env");
  process.exit(1);
}

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const conversationRoutes = require("./routes/conversations");
const messageRoutes = require("./routes/messages");
const registerSockets = require("./sockets");
const User = require("./models/User");

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_URL } });

app.get("/", (req, res) => {
  res.json({ ok: true, message: "chat server running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

// all socket events live in sockets/index.js
registerSockets(io);

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    // a crashed server leaves users marked online; clean that up on boot
    await User.updateMany({ isOnline: true }, { isOnline: false });
    // make sure the unique-username index really exists (e.g. after a DB wipe)
    await User.syncIndexes();
    console.log("mongodb connected");
    server.listen(PORT, () => console.log("server on port " + PORT));
  })
  .catch((err) => {
    console.error("mongodb connection failed:", err.message);
    process.exit(1);
  });
