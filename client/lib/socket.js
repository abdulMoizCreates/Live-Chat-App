import { io } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

// one shared connection for the whole app, we connect manually when needed
const socket = io(URL, { autoConnect: false });

export default socket;
