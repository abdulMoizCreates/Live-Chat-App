"use client";

import ChatItem from "./ChatItem";

// left pane: connection chip, search, chat list, logout
export default function Sidebar({
  me,
  chatItems,
  activeId,
  connected,
  search,
  onSearch,
  onSelect,
  onLogout,
  serverDown,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span className="brand">Live Chat</span>
        <span className="presence-user">
          {me?.username}
          <i className={connected ? "status-dot on" : "status-dot off"} />
        </span>
      </div>

      {serverDown && (
        <div className="error-banner">
          Cannot reach the server. Retrying in 5 seconds...
        </div>
      )}

      <input
        className="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search users..."
      />

      {/* everything in one list: chats + people without chats yet */}
      <div className="chat-list">
        {chatItems.length === 0 && (
          <div className="chat-list-empty">
            {search ? "No users found" : "No other users yet. Register a friend first."}
          </div>
        )}
        {chatItems.map((item) => (
          <ChatItem
            key={item.user._id}
            item={item}
            meId={me._id}
            activeId={activeId}
            onSelect={onSelect}
          />
        ))}
      </div>

      <button className="logout" onClick={onLogout}>
        Log out
      </button>
    </aside>
  );
}
