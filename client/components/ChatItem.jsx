"use client";

import { formatChatTime } from "../lib/format";

// one row in the sidebar: avatar + name, online dot, preview, time, unread badge
export default function ChatItem({ item, meId, activeId, onSelect }) {
  const { user, conv } = item;
  const preview = conv?.lastMessage?.text || "no messages yet";
  const time = formatChatTime(conv?.lastMessage?.createdAt);
  const unread = conv?.unreadCount || 0;

  return (
    <button
      className={user._id === activeId ? "chat-item active" : "chat-item"}
      onClick={() => onSelect(user)}
    >
      <span className="avatar">
        {(user.username || "?")[0].toUpperCase()}
        <i className={user.isOnline ? "presence on" : "presence"} />
      </span>

      <span className="chat-item-main">
        <span className="chat-item-top">
          <span className="chat-item-name">{user.username}</span>
          <span className="chat-item-time">{time}</span>
        </span>
        <span className="chat-item-bottom">
          <span className="chat-item-preview">
            {conv?.lastMessage && conv.lastMessage.sender === meId ? "You: " : ""}
            {preview}
          </span>
          {unread > 0 && <span className="badge">{unread}</span>}
        </span>
      </span>
    </button>
  );
}
