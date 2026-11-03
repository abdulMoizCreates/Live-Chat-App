// shared time formatting, keeps components small

// HH:MM inside a message bubble
export function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// HH:MM today, otherwise "3 Nov" - used for chat list previews
export function formatChatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatTime(iso);
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

// "last seen 3 Nov, 14:32"
export function formatLastSeen(iso) {
  if (!iso) return "";
  return (
    "last seen " +
    new Date(iso).toLocaleString([], {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}
