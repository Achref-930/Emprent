"use client";

import { useEffect, useState } from "react";
import LoginScreen from "./_components/LoginScreen";
import Dashboard from "./_components/Dashboard";
import { fetchOrdersRequest } from "./_components/api";

export default function Page() {
  // null = checking, "" = no/invalid token, string = valid token
  const [token, setToken] = useState(null);

  async function verifyToken(candidate) {
    if (!candidate) {
      setToken("");
      return;
    }
    try {
      const { status } = await fetchOrdersRequest(candidate);
      if (status === 401) {
        sessionStorage.removeItem("session_token");
        setToken("");
      } else {
        setToken(candidate);
      }
    } catch {
      sessionStorage.removeItem("session_token");
      setToken("");
    }
  }

  useEffect(() => {
    // Deferred so the effect body itself never synchronously calls
    // setState — verifyToken's first branch can call setToken("").
    queueMicrotask(() => verifyToken(sessionStorage.getItem("session_token")));
  }, []);

  function handleLoginSuccess(newToken) {
    setToken(newToken);
  }

  function handleLogout() {
    sessionStorage.removeItem("session_token");
    setToken("");
  }

  if (token === null) {
    // Avoid flashing the login screen while we check the existing session
    return <div className="min-h-screen bg-background" />;
  }

  if (!token) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}
