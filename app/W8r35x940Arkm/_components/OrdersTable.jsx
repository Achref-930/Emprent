import { useState } from "react";
import {
  formatDateTime,
  formatDA,
  statusBadgeClass,
  capitalize,
} from "./utils";
import CopyablePhone from "./CopyablePhone";
import EditableNotes from "./EditableNotes";
import StatusDropdown from "./StatusDropdown";
import OrderModal from "./OrderModal";

export default function OrdersTable({ orders, onUpdateOrder }) {
  const [expandedOrder, setExpandedOrder] = useState(null);

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg py-16 text-center text-gray-500">
        No orders found.
      </div>
    );
  }

  return (
    <>
      {/* Mobile compact list */}
      <div className="sm:hidden flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
        {orders.map((order) => (
          <CompactRow
            key={order._id}
            order={order}
            isLast={order._id === orders[orders.length - 1]._id}
            onUpdateOrder={onUpdateOrder}
            onExpand={() => setExpandedOrder(order)}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <DesktopTable
          orders={orders}
          onUpdateOrder={onUpdateOrder}
          onExpand={setExpandedOrder}
        />
      </div>

      {expandedOrder && (
        <OrderModal
          order={expandedOrder}
          onClose={() => setExpandedOrder(null)}
        />
      )}
    </>
  );
}

// Desktop table — now with a leading "#" row-number column and an
// expand/download action added to the Update column.
function DesktopTable({ orders, onUpdateOrder, onExpand }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="px-4 py-3 font-medium whitespace-nowrap">#</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Customer</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Phone</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Wilaya</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Commune</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Products</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Total</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Notes</th>
          <th className="px-4 py-3 font-medium whitespace-nowrap">Update</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr
            key={order._id}
            className="border-b border-gray-200 last:border-b-0 hover:bg-gray-100 align-top"
          >
            <td className="px-4 py-3 whitespace-nowrap text-gray-500">
              {order.orderNumber ?? "—"}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-gray-500">
              {formatDateTime(order.createdAt)}
            </td>
            <td className="px-4 py-3 font-medium">{order.customerName}</td>
            <td className="px-4 py-3">
              <CopyablePhone phone={order.phone} />
            </td>
            <td className="px-4 py-3">{order.wilaya}</td>
            <td className="px-4 py-3">
              <div className="flex flex-col">
                <span>{order.commune}</span>
                <span className="text-[10px] text-gray-500 mt-0.5 font-medium uppercase tracking-wider">
                  {order.deliveryType === "domicile" ? "🏠 Domicile" : "📦 Bureau"}
                </span>
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5 max-w-[240px]">
                {(order.products || []).map((p, i) => (
                  <div
                    key={i}
                    className="whitespace-nowrap truncate"
                    title={`${p.name} ${p.color || p.size ? `(${[p.color, p.size].filter(Boolean).join(", ")})` : ""} × ${p.quantity}`}
                  >
                    {p.name}
                    {(p.color || p.size) && (
                      <span className="text-gray-500">
                        {" "}
                        ({[p.color, p.size].filter(Boolean).join(", ")})
                      </span>
                    )}{" "}
                    <span className="text-gray-500">× {p.quantity}</span>
                  </div>
                ))}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex flex-col text-left">
                <span className="font-semibold text-gray-900">{formatDA(order.totalPrice)}</span>
                <span className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">
                  {formatDA(order.subtotal ?? (order.totalPrice - (order.shippingFee ?? 0)))} + {formatDA(order.shippingFee ?? 0)}
                </span>
              </div>
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
                  order.status,
                )}`}
              >
                {capitalize(order.status)}
              </span>
            </td>
            <td className="px-4 py-3 min-w-40">
              <EditableNotes
                value={order.notes}
                onSave={(notes) =>
                  onUpdateOrder(order._id, { status: order.status, notes })
                }
              />
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <StatusDropdown
                  value={order.status}
                  onChange={(status) =>
                    onUpdateOrder(order._id, { status, notes: order.notes })
                  }
                />
                <button
                  onClick={() => onExpand(order)}
                  title="Expand & download"
                  className="text-gray-500 hover:text-foreground hover:bg-gray-200 rounded-md p-1.5"
                >
                  <ExpandIcon />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

// Mobile compact row — now shows the order's stable order number in the
// collapsed summary, alongside the existing expand button in the revealed content.
function CompactRow({ order, isLast, onUpdateOrder, onExpand }) {
  const deliveryLabel = order.deliveryType ? `(${order.deliveryType === "domicile" ? "Domicile" : "Bureau"})` : "";
  const locationLabel = `${[order.wilaya, order.commune].filter(Boolean).join(" / ")} ${deliveryLabel}`.trim();

  return (
    <details className={`group ${isLast ? "" : "border-b border-gray-200"}`}>
      <summary className="list-none px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-100">
        <span className="text-gray-500 text-sm w-6 shrink-0">
          #{order.orderNumber ?? "—"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{order.customerName}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {formatDateTime(order.createdAt)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-semibold text-sm whitespace-nowrap">
            {formatDA(order.subtotal ?? (order.totalPrice - (order.shippingFee ?? 0)))}
          </span>
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadgeClass(
              order.status,
            )}`}
          >
            {capitalize(order.status)}
          </span>
        </div>
      </summary>

      <div className="px-4 pb-4 flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-3 text-gray-500">
          <CopyablePhone phone={order.phone} />
          <span className="text-right flex-1">{locationLabel || "—"}</span>
        </div>

        <div className="flex items-start justify-between gap-3 border-t border-gray-200 pt-3">
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="font-semibold text-[10px] text-gray-400 uppercase tracking-wider mb-1">Products</span>
            {(order.products || []).map((p, i) => (
              <div
                key={i}
                className="whitespace-nowrap truncate text-xs"
                title={`${p.name} ${p.color || p.size ? `(${[p.color, p.size].filter(Boolean).join(", ")})` : ""} × ${p.quantity}`}
              >
                {p.name}
                {(p.color || p.size) && (
                  <span className="text-gray-500">
                    {" "}
                    ({[p.color, p.size].filter(Boolean).join(", ")})
                  </span>
                )}{" "}
                <span className="text-gray-500">× {p.quantity}</span>
              </div>
            ))}
          </div>

          <StatusDropdown
            value={order.status}
            onChange={(status) =>
              onUpdateOrder(order._id, { status, notes: order.notes })
            }
          />
        </div>

        <div className="border-t border-gray-200 pt-3 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal:</span>
            <span>{formatDA(order.subtotal ?? (order.totalPrice - (order.shippingFee ?? 0)))}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Shipping Fee:</span>
            <span>+ {formatDA(order.shippingFee ?? 0)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5 mt-0.5 text-sm">
            <span>Total:</span>
            <span>{formatDA(order.totalPrice)}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <EditableNotes
            value={order.notes}
            onSave={(notes) =>
              onUpdateOrder(order._id, { status: order.status, notes })
            }
          />
        </div>

        {/* Expand button — opens full-screen modal for this order */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onExpand();
          }}
          className="border-t border-gray-200 pt-3 text-left text-sm font-medium hover:underline underline-offset-2"
        >
          Expand order ↗
        </button>
      </div>
    </details>
  );
}
