"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import StatsBar from "./StatsBar";
import FilterRow from "./FilterRow";
import OrdersTable from "./OrdersTable";
import { exportOrdersToCSV } from "./utils";
import { fetchOrdersRequest, updateOrderRequest } from "./api";

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const SITE_NAME = "Order Manager";

export default function Dashboard({ token, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

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
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o._id === orderId ? { ...o, status, notes } : o)),
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

      if (data.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? data.order : o)),
        );
      }
    } catch {
      // Revert on failure by refetching source of truth
      fetchOrders();
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "All") return true;
    return (order.status || "").toLowerCase() === activeFilter.toLowerCase();
  });

  function handleExport() {
    exportOrdersToCSV(filteredOrders, "orders.csv");
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
        <StatsBar orders={orders} />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterRow activeFilter={activeFilter} onChange={setActiveFilter} />
        </div>

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
            className="self-start bg-gray-200 hover:bg-gray-300 text-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export to CSV
          </button>
        )}
      </main>
    </div>
  );
}
