"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "../lib/socket";
import api from "../lib/api";
import { getUser, clearAuth } from "../lib/auth";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

// protected chat page: needs a token in localStorage
export default function Home() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null); // user object of open chat
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [typingUsername, setTypingUsername] = useState("");
  const [connected, setConnected] = useState(socket.connected);
  const [serverDown, setServerDown] = useState(false);

  // refs so socket handlers always see the current chat
  const activeUserId = useRef(null);
  const activeConvId = useRef(null);
  const convsRef = useRef([]); // conversations mirror for handlers
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);

  // redirect to /login when there is no session
  useEffect(() => {
    const u = getUser();
    if (!u) router.replace("/login");
    else setMe(u);
  }, [router]);

  // keep the conversations mirror fresh for the socket handlers
  useEffect(() => {
    convsRef.current = conversations;
  }, [conversations]);

  // debounced user search
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => loadUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, me]);

  // loaders; every failure shows the retrying banner state
  async function loadUsers(q = "") {
    try {
      setUsers(await api("/api/users" + (q ? "?search=" + encodeURIComponent(q) : "")));
      setServerDown(false);
    } catch {
      setServerDown(true);
    }
  }

  async function loadConversations() {
    try {
      setConversations(await api("/api/conversations"));
    } catch {
      setServerDown(true);
    }
  }

  // socket wiring, once the user is known
  useEffect(() => {
    if (!me) return;

    loadUsers();
    loadConversations();

    socket.on("connect", () => {
      setConnected(true);
      // after a (re)connect, pull fresh state so nothing was missed offline
      loadUsers();
      loadConversations();
      const id = activeUserId.current;
      if (id) {
        api("/api/messages/" + id)
          .then((res) => {
            setMessages(res.messages || []);
            setHasMore(res.hasMore);
            setPage(1);
          })
          .catch(() => {});
      }
    });
    socket.on("disconnect", () => setConnected(false));

    // dead/expired token sent us here -> back to login
    socket.on("connect_error", (err) => {
      if (err && err.message === "unauthorized") {
        clearAuth();
        router.replace("/login");
      }
    });

    socket.on("new_message", (msg) => {
      // first message ever in this chat: bind the conversation id
      if (msg.sender === me._id && activeUserId.current && !activeConvId.current) {
        activeConvId.current = msg.conversation;
      }

      // append/refresh if it belongs to the open chat
      if (msg.conversation === activeConvId.current) {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id)
            ? prev.map((m) => (m._id === msg._id ? msg : m))
            : [...prev, msg]
        );
        // opened chat = eyes on screen -> read receipts go out
        if (msg.sender !== me._id) socket.emit("mark_read", { from: msg.sender });
      }

      // update sidebar preview + unread badge
      const known = convsRef.current.some((c) => c._id === msg.conversation);
      if (!known) loadConversations();
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id !== msg.conversation) return c;
          const next = { ...c, lastMessage: msg, updatedAt: msg.createdAt };
          if (msg.sender !== me._id) {
            next.unreadCount =
              msg.conversation === activeConvId.current
                ? 0
                : (c.unreadCount || 0) + 1;
          }
          return next;
        })
      );
    });

    socket.on("messages_read", ({ conversation, by, messageIds }) => {
      // someone read partner messages; by === me means my other tab read them
      setConversations((prev) =>
        prev.map((c) => (c._id === conversation && by === me._id ? { ...c, unreadCount: 0 } : c))
      );
      if (by !== me._id && conversation === activeConvId.current) {
        const ids = messageIds || [];
        setMessages((prev) =>
          prev.map((m) => (ids.includes(m._id) ? { ...m, status: "read" } : m))
        );
      }
    });

    socket.on("typing", ({ from, username }) => {
      if (from !== activeUserId.current) return;
      setTypingUsername(username || "someone");
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingUsername(""), 2000);
    });

    socket.on("stop_typing", ({ from }) => {
      if (from !== activeUserId.current) return;
      clearTimeout(typingTimer.current);
      setTypingUsername("");
    });

    socket.on("presence", (p) => {
      setUsers((prev) =>
        prev.map((u) =>
          u._id === p.userId
            ? { ...u, isOnline: p.isOnline, lastSeen: p.lastSeen || u.lastSeen }
            : u
        )
      );
      // keep the open chat header in sync too
      setActive((prev) =>
        prev && prev._id === p.userId
          ? { ...prev, isOnline: p.isOnline, lastSeen: p.lastSeen || prev.lastSeen }
          : prev
      );
    });

    socket.connect();

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("new_message");
      socket.off("messages_read");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("presence");
      socket.disconnect();
    };
  }, [me, router]);

  // anything failed to load (server down) -> retry every 5s until it works
  useEffect(() => {
    if (!serverDown || !me) return;
    const t = setTimeout(() => {
      loadUsers(search);
      loadConversations();
    }, 5000);
    return () => clearTimeout(t);
  }, [serverDown, me, search]);

  // sidebar = users merged with conversation info, newest chat first
  const chatItems = useMemo(() => {
    const map = new Map();
    for (const u of users) map.set(u._id, { user: u, conv: null });
    for (const c of conversations) {
      const other = (c.participants || []).find((p) => p && p._id !== me._id);
      if (other) map.set(other._id, { ...map.get(other._id), conv: c });
    }
    return [...map.values()].sort((a, b) => {
      const ta = a.conv?.lastMessage ? new Date(a.conv.lastMessage.createdAt) : 0;
      const tb = b.conv?.lastMessage ? new Date(b.conv.lastMessage.createdAt) : 0;
      if (ta !== tb) return tb - ta;
      return (a.user.username || "").localeCompare(b.user.username || "");
    });
  }, [users, conversations, me]);

  async function openChat(user) {
    setActive(user);
    activeUserId.current = user._id;
    activeConvId.current = null; // bound on first message / history load
    setMessages([]);
    setHasMore(false);
    setPage(1);
    setTypingUsername("");
    try {
      const res = await api("/api/messages/" + user._id);
      setMessages(res.messages || []);
      setHasMore(res.hasMore);
      const conv = convsRef.current.find((c) =>
        (c.participants || []).some((p) => p && p._id === user._id)
      );
      if (conv) {
        activeConvId.current = conv._id;
        if (conv.unreadCount) socket.emit("mark_read", { from: user._id });
        setConversations((prev) =>
          prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch {
      // history failing should not block chatting (polished up in phase 3)
    }
  }

  function closeChat() {
    setActive(null);
    activeUserId.current = null;
    activeConvId.current = null;
    setMessages([]);
    setHasMore(false);
    setTypingUsername("");
  }

  async function loadOlder() {
    const id = activeUserId.current;
    if (!id) return;
    try {
      const res = await api(`/api/messages/${id}?page=${page + 1}`);
      setMessages((prev) => [...res.messages, ...prev]);
      setHasMore(res.hasMore);
      setPage((p) => p + 1);
    } catch {
      // ignored in this phase
    }
  }

  function sendMessage(text) {
    const clean = text.trim();
    if (!clean || !activeUserId.current) return;
    socket.emit("send_message", { to: activeUserId.current, text: clean });
    socket.emit("stop_typing", { to: activeUserId.current });
    // own message appears when the server echoes it back with its id
  }

  function handleType() {
    const to = activeUserId.current;
    if (!to) return;
    const now = Date.now();
    if (now - lastTypingSent.current > 800) {
      socket.emit("typing", { to });
      lastTypingSent.current = now;
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("stop_typing", { to }), 1500);
  }

  function logout() {
    socket.disconnect();
    clearAuth();
    router.replace("/login");
  }

  if (!me) return <div className="page-loading" />;

  return (
    <main className={active ? "app show-chat" : "app"}>
      <Sidebar
        me={me}
        chatItems={chatItems}
        activeId={active && active._id}
        connected={connected}
        search={search}
        onSearch={setSearch}
        onSelect={openChat}
        onLogout={logout}
        serverDown={serverDown}
      />
      <ChatWindow
        me={me}
        active={active}
        messages={messages}
        hasMore={hasMore}
        typingUsername={typingUsername}
        connected={connected}
        onLoadOlder={loadOlder}
        onSend={sendMessage}
        onType={handleType}
        onBack={closeChat}
      />
    </main>
  );
}
