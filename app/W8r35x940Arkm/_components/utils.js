export function formatDateTime(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "—";

  // Always render in Algeria time (UTC+1, no DST), regardless of the
  // timezone the viewing device happens to be set to. Without this,
  // the same order can show a different time depending on whichever
  // computer/phone is being used to view the dashboard.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Algiers",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";

  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

export function formatDA(amount) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString("en-US")} DA`;
}

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function statusBadgeClass(status) {
  const key = (status || "").toLowerCase();
  return STATUS_STYLES[key] || "bg-gray-100 text-gray-800";
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const STATUS_COLORS = {
  pending:   { bg: "#fef9c3", text: "#854d0e" },
  confirmed: { bg: "#dbeafe", text: "#1e40af" },
  shipped:   { bg: "#dcfce7", text: "#166534" },
  cancelled: { bg: "#fee2e2", text: "#991b1b" },
};

export function printOrdersToPDF(orders, filterLabel = "All") {
  const now = formatDateTime(new Date());

  // ── Stats ──────────────────────────────────────────────
  const counts = orders.reduce(
    (acc, o) => {
      const s = (o.status || "pending").toLowerCase();
      if (acc[s] !== undefined) acc[s] += 1;
      return acc;
    },
    { pending: 0, confirmed: 0, shipped: 0, cancelled: 0 },
  );
  const totalRevenue = orders
    .filter((o) => (o.status || "") !== "cancelled")
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const statsHtml = [
    ["Total Orders", orders.length, "#f3f4f6", "#111827"],
    ["Pending",    counts.pending,   "#fef9c3", "#854d0e"],
    ["Confirmed",  counts.confirmed, "#dbeafe", "#1e40af"],
    ["Shipped",    counts.shipped,   "#dcfce7", "#166534"],
    ["Cancelled",  counts.cancelled, "#fee2e2", "#991b1b"],
    ["Revenue",    formatDA(totalRevenue), "#f3f4f6", "#111827"],
  ]
    .map(
      ([label, val, bg, color]) =>
        `<div style="background:${bg};color:${color};border-radius:8px;padding:10px 14px;min-width:90px;text-align:center">
           <div style="font-size:20px;font-weight:700;letter-spacing:-0.5px">${val}</div>
           <div style="font-size:11px;margin-top:2px;opacity:0.8">${label}</div>
         </div>`,
    )
    .join("");

  // ── Rows ───────────────────────────────────────────────
  const rowsHtml = orders
    .map((order, idx) => {
      const products = (order.products || [])
        .map((p) => {
          const variant = [p.color, p.size].filter(Boolean).join(", ");
          return `<span>${variant ? `${p.name} <em style="color:#6b7280">(${variant})</em>` : p.name} &times;${p.quantity}</span>`;
        })
        .join("<br>");

      const s = (order.status || "pending").toLowerCase();
      const sc = STATUS_COLORS[s] || { bg: "#f3f4f6", text: "#374151" };
      const badge = `<span style="background:${sc.bg};color:${sc.text};border-radius:99px;padding:2px 10px;font-size:11px;font-weight:600;white-space:nowrap">${capitalize(order.status)}</span>`;

      const rowBg = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
      return `<tr style="background:${rowBg}">
        <td>${formatDateTime(order.createdAt)}</td>
        <td>${order.customerName}</td>
        <td>${order.phone}</td>
        <td>${order.wilaya}${order.commune ? ` / ${order.commune}` : ""}</td>
        <td>${products}</td>
        <td style="text-align:right;white-space:nowrap">${formatDA(order.totalPrice)}</td>
        <td style="text-align:center">${badge}</td>
        <td style="color:#6b7280;font-style:italic">${order.notes || "—"}</td>
      </tr>`;
    })
    .join("");

  // ── Full document ──────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Orders Export — ${now}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           font-size: 12px; color: #111827; background: #fff; padding: 28px 32px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-end;
              border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 20px; }
    .header-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header-meta  { font-size: 11px; color: #6b7280; text-align: right; }

    /* Stats */
    .stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #111827; color: #fff; padding: 9px 10px;
               text-align: left; font-size: 11px; font-weight: 600;
               text-transform: uppercase; letter-spacing: 0.05em; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb;
               vertical-align: top; line-height: 1.5; }
    tbody tr:hover { background: #f0f9ff !important; }

    /* Footer */
    .footer { margin-top: 20px; font-size: 10px; color: #9ca3af;
              text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }

    @media print {
      body { padding: 12px 16px; }
      .no-print { display: none !important; }
      tbody tr:hover { background: inherit !important; }
      @page { size: A4 landscape; margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-title">Emprent — Orders Report</div>
      <div style="font-size:12px;color:#6b7280;margin-top:3px">Filter: ${filterLabel}</div>
    </div>
    <div class="header-meta">
      <div>Generated: ${now}</div>
      <div>${orders.length} order${orders.length !== 1 ? "s" : ""}</div>
    </div>
  </div>

  <div class="stats">${statsHtml}</div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Customer</th>
        <th>Phone</th>
        <th>Location</th>
        <th>Products</th>
        <th style="text-align:right">Total</th>
        <th style="text-align:center">Status</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" style="text-align:center;padding:24px;color:#9ca3af">No orders</td></tr>'}
    </tbody>
  </table>

  <div class="footer">Emprent Order Management System &bull; ${now}</div>

  <script>
    window.onload = function () { window.print(); };
  <\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1100,height=750");
  if (!win) { alert("Please allow popups for this page to export."); return; }
  win.document.write(html);
  win.document.close();
}
