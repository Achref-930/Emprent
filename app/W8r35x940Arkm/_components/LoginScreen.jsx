"use client";

import { useState, useEffect } from "react";
import { loginRequest } from "./api";

export default function LoginScreen({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [remaining, setRemaining] = useState(0);

  // Tick the countdown while locked
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const secsLeft = Math.max(
        0,
        Math.ceil((lockedUntil - Date.now()) / 1000),
      );
      setRemaining(secsLeft);
      if (secsLeft <= 0) {
        setLockedUntil(null);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (lockedUntil || loading) return;
    setError("");
    setLoading(true);

  try {
    const { ok, status, data } = await loginRequest(password);

    if (ok && data.token) {
      sessionStorage.setItem("session_token", data.token);
      onSuccess(data.token);
      return;
    }

    if (status === 429 && data.lockoutRemaining) {
      const until = Date.now() + data.lockoutRemaining * 1000;
      setLockedUntil(until);
      setRemaining(data.lockoutRemaining);
      setError("Too many attempts. Try again later.");
    } else {
      setError(data.message || "Incorrect password.");
    }
  } catch {
    setError("Something went wrong. Try again.");
  } finally {
    setLoading(false);
    setPassword("");
  }
  }

  const isLocked = Boolean(lockedUntil);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gray-100 border border-gray-200 rounded-lg p-8"
      >
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLocked || loading}
          placeholder="Password"
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-foreground placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
        />

        {error && !isLocked && (
          <p className="mt-3 text-sm text-red-800">{error}</p>
        )}

        {isLocked && (
          <p className="mt-3 text-sm text-red-800">
            Too many attempts. Try again in{" "}
            <span className="font-medium tabular-nums">
              {formatTime(remaining)}
            </span>
          </p>
        )}

        <button
          type="submit"
          disabled={isLocked || loading || !password}
          className="mt-4 w-full rounded-md bg-black text-white py-2.5 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
