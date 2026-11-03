const jwt = require("jsonwebtoken");

// Socket guard: the token can be sent in the handshake as { auth: { token } }
module.exports = function socketAuth(socket, next) {
  const token =
    (socket.handshake.auth && socket.handshake.auth.token) ||
    (socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) return next(new Error("unauthorized"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = payload.id;
    socket.data.username = payload.username;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
};
