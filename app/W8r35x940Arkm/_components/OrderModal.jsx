"use client";

import { useRef, useState } from "react";
import {
  formatDateTime,
  formatDA,
  statusBadgeClass,
  capitalize,
} from "./utils";

export default function OrderModal({ order, onClose }) {
  const captureRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    setError("");
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeName = (order.customerName || "order").replace(/\s+/g, "_");
      link.href = dataUrl;
      link.download = `order_${safeName}_${order._id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Order image capture failed:", err);
      setError("Couldn't generate the image. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar with close button — not part of the captured image */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-medium text-sm text-gray-500">
            Order details
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-foreground text-sm px-2 py-1"
          >
            Close
          </button>
        </div>

        {/* This block is what gets captured as the image */}
        <div ref={captureRef} className="p-6 flex flex-col gap-4 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-lg">{order.customerName}</p>
              <p className="text-sm mt-0.5" style={{ color: "#737373" }}>
                {formatDateTime(order.createdAt)}
              </p>
            </div>
            <span
              className={`shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
                order.status,
              )}`}
            >
              {capitalize(order.status)}
            </span>
          </div>

          <div
            className="flex items-center justify-between text-sm pt-4"
            style={{ borderTop: "1px solid #E5E5E5" }}
          >
            <span style={{ color: "#737373" }}>Phone</span>
            <span className="font-medium">{order.phone || "—"}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#737373" }}>Wilaya</span>
            <span className="font-medium">{order.wilaya || "—"}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#737373" }}>Commune</span>
            <span className="font-medium">{order.commune || "—"}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#737373" }}>Delivery Type</span>
            <span className="font-medium">
              {order.deliveryType === "domicile" ? "🏠 Domicile" : "📦 Bureau"}
            </span>
          </div>

          <div className="pt-4" style={{ borderTop: "1px solid #E5E5E5" }}>
            <p className="text-sm mb-2" style={{ color: "#737373" }}>
              Products
            </p>
            <div className="flex flex-col gap-1 text-sm">
              {(order.products || []).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span>
                    {p.name}
                    {(p.color || p.size) && (
                      <span style={{ color: "#737373" }}>
                        {" "}
                        ({[p.color, p.size].filter(Boolean).join(", ")})
                      </span>
                    )}
                  </span>
                  <span style={{ color: "#737373" }}>
                    × {p.quantity}{" "}
                    {p.price ? `— ${formatDA(p.price * p.quantity)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col gap-1.5 pt-4"
            style={{ borderTop: "1px solid #E5E5E5" }}
          >
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "#737373" }}>Subtotal</span>
              <span className="font-medium">
                {formatDA(order.subtotal ?? (order.totalPrice - (order.shippingFee ?? 0)))}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "#737373" }}>Shipping Fee</span>
              <span className="font-medium">
                + {formatDA(order.shippingFee ?? 0)}
              </span>
            </div>
            <div
              className="flex items-center justify-between pt-3 mt-1.5"
              style={{ borderTop: "1px solid #E5E5E5" }}
            >
              <span className="font-semibold text-sm">Total</span>
              <span className="font-bold text-lg text-black">
                {formatDA(order.totalPrice)}
              </span>
            </div>
          </div>

          {order.notes && (
            <div className="pt-4" style={{ borderTop: "1px solid #E5E5E5" }}>
              <p className="text-sm mb-1" style={{ color: "#737373" }}>
                Notes
              </p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Action bar — not part of the captured image */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-black text-white py-2.5 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {downloading ? "Preparing image…" : "Download as image"}
          </button>
          {error && <p className="text-sm text-red-800">{error}</p>}
        </div>
      </div>
    </div>
  );
}
