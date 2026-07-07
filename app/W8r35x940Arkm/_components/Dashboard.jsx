"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import StatsBar from "./StatsBar";
import FilterRow from "./FilterRow";
import OrdersTable from "./OrdersTable";
import StockManager from "./StockManager";
import { printOrdersToPDF } from "./utils";
import { fetchOrdersRequest, updateOrderRequest } from "./api";

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const SITE_NAME = "Order Manager";
const POLL_INTERVAL_MS = 18 * 1000; // 15–20s live sync while Orders tab is active

function SyncIndicator({ lastSyncedAt, onRefresh }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = lastSyncedAt
    ? Math.max(0, Math.round((Date.now() - lastSyncedAt) / 1000))
    : null;

  const label =
    secondsAgo === null
      ? "Syncing…"
      : secondsAgo < 5
        ? "Synced just now"
        : `Synced ${secondsAgo}s ago`;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span>{label}</span>
      <button
        onClick={onRefresh}
        aria-label="Refresh orders now"
        className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
    </div>
  );
}

export default function Dashboard({ token, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "stock"
  const [updateError, setUpdateError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const inactivityTimer = useRef(null);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  /**
   * silent = true for background polling: no loading spinner, no error
   * banner, and the orders array is only replaced if the fetched data
   * actually differs — so the table doesn't flicker/reset scroll or
   * close an open modal when nothing changed.
   */
  const fetchOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setLoadError("");
      }
      try {
        const { ok, status, data } = await fetchOrdersRequest(token);

        if (status === 401) {
          onLogout();
          return;
        }

        if (!ok) {
          if (!silent) setLoadError("Couldn't load orders. Try refreshing.");
          return;
        }

        const incoming = Array.isArray(data.orders) ? data.orders : data;
        const changed =
          JSON.stringify(incoming) !== JSON.stringify(ordersRef.current);
        if (changed) {
          setOrders(incoming);
        }
        setLastSyncedAt(Date.now());
      } catch {
        if (!silent) setLoadError("Couldn't load orders. Try refreshing.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, onLogout],
  );

  useEffect(() => {
    // Deferred so the effect body itself never synchronously calls
    // setState (fetchOrders' first line is setLoading) — it just
    // schedules the fetch for the next microtask instead.
    queueMicrotask(() => fetchOrders());
  }, [fetchOrders]);

  // Live sync: poll while the Orders tab is active, the browser tab is
  // visible, and pause entirely while the Stock tab is showing.
  useEffect(() => {
    if (activeTab !== "orders") return;

    let intervalId = null;

    function startPolling() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        fetchOrders({ silent: true });
      }, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling();
      } else {
        // Catch up immediately when the tab regains focus, then resume.
        fetchOrders({ silent: true });
        startPolling();
      }
    }

    if (!document.hidden) startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTab, fetchOrders]);



  // Inactivity auto-logout
  useEffect(() => {
    function resetTimer() {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        onLogout();
      }, INACTIVITY_LIMIT_MS);
    }

    const events = ["click", "scroll", "keydown"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [onLogout]);

  async function handleUpdateOrder(orderId, { status, notes }) {
    // Notes-only edits are always safe to apply optimistically. Status
    // changes can be rejected (e.g. not enough stock to confirm), so we
    // wait for the server's answer before touching that field in the UI.
    setUpdateError("");
    setOrders((prev) =>
      prev.map((o) => (o._id === orderId ? { ...o, notes } : o)),
    );

    try {
      const { status: responseStatus, data } = await updateOrderRequest(
        token,
        orderId,
        { status, notes },
      );

      if (responseStatus === 401) {
        onLogout();
        return;
      }

      if (responseStatus === 409) {
        // Blocked — not enough stock to make this transition.
        const detail = (data.insufficient || [])
          .map(
            (i) =>
              `${i.name} (${i.size}): ${i.available} in stock, ${i.requested} needed`,
          )
          .join("; ");
        setUpdateError(
          detail ? `${data.message} — ${detail}` : data.message,
        );
        return;
      }

      if (!data.order) {
        setUpdateError("Couldn't update this order. Try again.");
        return;
      }

      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? data.order : o)),
      );
    } catch {
      setUpdateError("Couldn't update this order. Try again.");
      fetchOrders();
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "All") return true;
    return (order.status || "").toLowerCase() === activeFilter.toLowerCase();
  });

  function handleExport() {
    printOrdersToPDF(filteredOrders, activeFilter);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <span className="font-semibold text-lg">{SITE_NAME}</span>
        <button
          onClick={onLogout}
          className="bg-gray-200 hover:bg-gray-300 text-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Log out
        </button>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "orders"
                ? "bg-black text-white"
                : "bg-gray-100 text-foreground hover:bg-gray-200"
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "stock"
                ? "bg-black text-white"
                : "bg-gray-100 text-foreground hover:bg-gray-200"
            }`}
          >
            Stock
          </button>
        </div>

        {activeTab === "orders" ? (
          <>
            <StatsBar orders={orders} />

            <div className="flex items-center justify-between flex-wrap gap-3">
              <FilterRow
                activeFilter={activeFilter}
                onChange={setActiveFilter}
              />
              <SyncIndicator
                lastSyncedAt={lastSyncedAt}
                onRefresh={() => fetchOrders({ silent: true })}
              />
            </div>

            {updateError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-3">
                <span>{updateError}</span>
                <button
                  onClick={() => setUpdateError("")}
                  className="shrink-0 text-red-800/70 hover:text-red-800 font-medium"
                >
                  Dismiss
                </button>
              </div>
            )}

            {loading ? (
              <div className="bg-white border border-gray-200 rounded-lg py-16 text-center text-gray-500">
                Loading orders…
              </div>
            ) : loadError ? (
              <div className="bg-white border border-gray-200 rounded-lg py-16 text-center text-red-800">
                {loadError}
              </div>
            ) : (
              <OrdersTable
                orders={filteredOrders}
                onUpdateOrder={handleUpdateOrder}
              />
            )}

            {!loading && !loadError && (
              <button
                onClick={handleExport}
                disabled={filteredOrders.length === 0}
              className="self-start flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print / Save as PDF
              </button>
            )}
          </>
        ) : (
          <StockManager token={token} onLogout={onLogout} />
        )}
      </main>
    </div>
  );
}
