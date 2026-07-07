// ════════════════════════════════════════════════════════
// DATA LAYER — the only file that knows whether we're using
// mock data or the real backend.
//
// When your MongoDB + API routes are ready, this is the ONLY
// file you need to rewrite. LoginScreen.jsx and Dashboard.jsx
// never change — they just call these same function names.
// ════════════════════════════════════════════════════════

import { MOCK_ORDERS } from "./mockData";

// Flip this to false once your real API routes exist.
const USE_MOCK = false;

// In-memory store so edits persist while you click around
// (resets on page refresh, since there's no real database yet).
let mockOrders = [...MOCK_ORDERS];

export async function loginRequest(password) {
  if (USE_MOCK) {
    await delay(400);
    if (password === "test1234") {
      return { ok: true, data: { token: "mock-token-123" } };
    }
    return {
      ok: false,
      status: 401,
      data: { message: "Incorrect password." },
    };
  }

  const res = await fetch("/api/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function fetchOrdersRequest(token) {
  if (USE_MOCK) {
    await delay(500);
    return {
      ok: true,
      status: 200,
      data: { orders: mockOrders },
    };
  }

  const res = await fetch("/api/get-orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function updateOrderRequest(token, orderId, { status, notes }) {
  if (USE_MOCK) {
    await delay(300);
    mockOrders = mockOrders.map((o) =>
      o._id === orderId ? { ...o, status, notes } : o,
    );
    const updated = mockOrders.find((o) => o._id === orderId);
    return { ok: true, status: 200, data: { order: updated } };
  }

  const res = await fetch("/api/update-order", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId, status, notes }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function fetchProductsRequest(token) {
  const res = await fetch("/api/admin-products", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function updateProductRequest(token, productId, updates) {
  const res = await fetch("/api/admin-products", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, ...updates }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

