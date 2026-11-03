"use client";

import { formatTime } from "../lib/format";

// ticks: one = sent, two = delivered, blue two = read
function Ticks({ status }) {
  if (status === "read") {
    return (
      <svg className="tick read" viewBox="0 0 18 12" aria-label="read">
        <path d="M2 6.5 L4.5 9 L9.5 3" />
        <path d="M8 6.5 L10.5 9 L15.5 3" />
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <svg className="tick" viewBox="0 0 18 12" aria-label="delivered">
        <path d="M2 6.5 L4.5 9 L9.5 3" />
        <path d="M8 6.5 L10.5 9 L15.5 3" />
      </svg>
    );
  }
  return (
    <svg className="tick" viewBox="0 0 12 12" aria-label="sent">
      <path d="M2 6.5 L4.5 9 L9.5 3" />
    </svg>
  );
}

export default function MessageBubble({ msg, mine }) {
  return (
    <div className={mine ? "msg mine" : "msg"}>
      <div className="bubble-row">
        <div className="bubble">{msg.text}</div>
        {mine && <Ticks status={msg.status} />}
      </div>
      <span className="msg-time">{formatTime(msg.createdAt)}</span>
    </div>
  );
}
