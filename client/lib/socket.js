import { io } from "socket.io-client";
import { getToken } from "./auth";

const URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

// one shared connection for the whole app, we connect manually when needed
// auth as a function so a fresh token is read on every (re)connect attempt
const socket = io(URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: getToken() }),
});

export default socket;
