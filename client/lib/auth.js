// tiny localStorage wrapper for the JWT session
const KEY_TOKEN = "chat-token";
const KEY_USER = "chat-user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_TOKEN);
}

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEY_USER) || "null");
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  localStorage.setItem(KEY_TOKEN, token);
  localStorage.setItem(KEY_USER, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
}
