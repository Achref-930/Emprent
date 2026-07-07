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

export default function Dashboard({ token, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "stock"
  const [updateError, setUpdateError] = useState("");

  const inactivityTimer = useRef(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { ok, status, data } = await fetchOrdersRequest(token);

      if (status === 401) {
        onLogout();
        return;
      }

      if (!ok) {
        setLoadError("Couldn't load orders. Try refreshing.");
        return;
      }

      setOrders(Array.isArray(data.orders) ? data.orders : data);
    } catch {
      setLoadError("Couldn't load orders. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    // Deferred so the effect body itself never synchronously calls
    // setState (fetchOrders' first line is setLoading) — it just
    // schedules the fetch for the next microtask instead.
    queueMicrotask(() => fetchOrders());
  }, [fetchOrders]);

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
