import { getToken } from "./auth";

const BASE = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

// small fetch wrapper, throws the server's error message if any
export default async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("cannot reach the chat server");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "request failed");
  return data;
}
