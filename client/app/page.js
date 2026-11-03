"use client";

import { useEffect, useRef, useState } from "react";
import socket from "../lib/socket";

const ROOMS = ["general", "random", "tech"];

export default function Home() {
  const [username, setUsername] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [room, setRoom] = useState("general");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [text, setText] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [connected, setConnected] = useState(false);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);

  // remember the name after refresh
  useEffect(() => {
    const saved = localStorage.getItem("chat-username");
    if (saved) setUsername(saved);
  }, []);

  useEffect(() => {
    if (!username) return;

    const joinRoom = () => {
      setConnected(true);
      socket.emit("join", { username, room });
    };

    socket.on("connect", joinRoom);
    socket.on("disconnect", () => setConnected(false));

    socket.on("history", (list) => setMessages(list));
    socket.on("message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("system", (info) =>
      setMessages((prev) => [
        ...prev,
        { _id: "sys-" + Date.now() + Math.random(), system: true, text: info },
      ])
    );
    socket.on("users", (list) => setUsers(list));
    socket.on("typing", (name) => {
      setTypingUser(name);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingUser(""), 1500);
    });

    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("history");
      socket.off("message");
      socket.off("system");
      socket.off("users");
      socket.off("typing");
    };
  }, [username, room]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleJoin(e) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem("chat-username", name);
    setUsername(name);
  }

  function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit("message", text);
    setText("");
  }

  function handleTyping(e) {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingSent.current > 800) {
      socket.emit("typing");
      lastTypingSent.current = now;
    }
  }

  function changeRoom(r) {
    if (r === room) return;
    setMessages([]);
    setUsers([]);
    setTypingUser("");
    setRoom(r);
  }

  function logout() {
    socket.disconnect();
    localStorage.removeItem("chat-username");
    setUsername("");
    setMessages([]);
    setUsers([]);
  }

  function formatTime(d) {
    if (!d) return "";
    return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (!username) {
    return (
      <main className="login-wrap">
        <form className="login-box" onSubmit={handleJoin}>
          <h1>Live Chat</h1>
          <p>Pick a name and jump in</p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            maxLength={20}
            autoFocus
          />
          <button type="submit">Join</button>
        </form>
      </main>
    );
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <h2>Rooms</h2>
        <ul className="rooms">
          {ROOMS.map((r) => (
            <li key={r}>
              <button
                className={r === room ? "room active" : "room"}
                onClick={() => changeRoom(r)}
              >
                # {r}
              </button>
            </li>
          ))}
        </ul>

        <h2>Online ({users.length})</h2>
        <ul className="users">
          {users.map((u) => (
            <li key={u}>
              <span className="dot" /> {u}
              {u === username ? " (you)" : ""}
            </li>
          ))}
        </ul>

        <button className="logout" onClick={logout}>
          Leave
        </button>
      </aside>

      <section className="chat">
        <header className="chat-head">
          <h2># {room}</h2>
          <span className={connected ? "status on" : "status off"}>
            {connected ? "connected" : "reconnecting..."}
          </span>
        </header>

        <div className="messages">
          {messages.map((m) =>
            m.system ? (
              <div key={m._id} className="system">
                {m.text}
              </div>
            ) : (
              <div
                key={m._id}
                className={m.username === username ? "msg mine" : "msg"}
              >
                <div className="meta">
                  <b>{m.username === username ? "You" : m.username}</b>
                  <span>{formatTime(m.createdAt)}</span>
                </div>
                <div className="bubble">{m.text}</div>
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>

        <div className="typing">
          {typingUser && typingUser !== username ? `${typingUser} is typing...` : ""}
        </div>

        <form className="composer" onSubmit={handleSend}>
          <input
            value={text}
            onChange={handleTyping}
            placeholder={`Message #${room}`}
            maxLength={1000}
          />
          <button type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}
