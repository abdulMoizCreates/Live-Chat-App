"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../lib/api";
import { setAuth } from "../lib/auth";

// one form for both pages, mode is "login" | "register"
export default function AuthForm({ mode }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { token, user } = await api(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        { method: "POST", body: { username, password } }
      );
      setAuth(token, user);
      router.replace("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <h1>Live Chat</h1>
        <p>{mode === "login" ? "Log in to your chats" : "Create your account"}</p>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          maxLength={20}
          autoFocus
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          maxLength={30}
        />

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={busy}>
          {busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
        </button>

        {mode === "login" ? (
          <Link href="/register" className="auth-link">
            No account yet? Create one
          </Link>
        ) : (
          <Link href="/login" className="auth-link">
            Already registered? Log in
          </Link>
        )}
      </form>
    </main>
  );
}
