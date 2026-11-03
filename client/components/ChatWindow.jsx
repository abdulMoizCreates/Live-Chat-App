"use client";

import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import { formatLastSeen } from "../lib/format";

// right pane: header with partner status, message list, typing, composer
export default function ChatWindow({
  me,
  active,
  messages,
  hasMore,
  typingUsername,
  connected,
  onLoadOlder,
  onSend,
  onType,
  onBack,
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const lastTail = useRef(null);

  // auto scroll on new messages, but not when older ones are prepended
  useEffect(() => {
    if (!messages.length) return;
    const tail = messages[messages.length - 1]._id;
    if (lastTail.current !== tail) {
      lastTail.current = tail;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // fresh chat -> clear the composer
  useEffect(() => {
    setText("");
  }, [active && active._id]);

  function submit(e) {
    e.preventDefault();
    onSend(text);
    setText("");
  }

  // header status line
  let status = "";
  if (typingUsername) status = "typing...";
  else if (active?.isOnline) status = "online";
  else if (active?.lastSeen) status = formatLastSeen(active.lastSeen);

  return (
    <section className="chat">
      <header className="chat-head">
        <button className="back" onClick={onBack} aria-label="back">
          &#8592;
        </button>
        <div className="chat-head-info">
          <b>{active ? active.username : "Select a chat"}</b>
          {active && <span className="chat-head-status">{status}</span>}
        </div>
        <span className={connected ? "status on" : "status off"}>
          {connected ? "connected" : "reconnecting..."}
        </span>
      </header>

      <div className="messages">
        {hasMore && (
          <button className="older" onClick={onLoadOlder}>
            Load older messages
          </button>
        )}

        {active && messages.length === 0 && (
          <div className="system">Say hi to {active.username}</div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m._id} msg={m} mine={m.sender === me._id} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="typing">{typingUsername && `${typingUsername} is typing...`}</div>

      {active ? (
        <form className="composer" onSubmit={submit}>
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onType(e.target.value);
            }}
            placeholder={`Message ${active.username}`}
            maxLength={1000}
            autoFocus
          />
          <button type="submit">Send</button>
        </form>
      ) : (
        <div className="composer composer-disabled">
          Open a chat to start messaging
        </div>
      )}
    </section>
  );
}
