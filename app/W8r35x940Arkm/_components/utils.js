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

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportOrdersToCSV(orders, filename = "orders.csv") {
  const headers = [
    "Date",
    "Name",
    "Phone",
    "Wilaya",
    "Commune",
    "Products",
    "Quantities",
    "Total",
    "Status",
    "Notes",
  ];

  const rows = orders.map((order) => {
    const products = (order.products || [])
      .map((p) => {
        const variant = [p.color, p.size].filter(Boolean).join(", ");
        return variant ? `${p.name} (${variant})` : p.name;
      })
      .join(" | ");
    const quantities = (order.products || [])
      .map((p) => p.quantity)
      .join(" | ");

    return [
      formatDateTime(order.createdAt),
      order.customerName,
      order.phone,
      order.wilaya,
      order.commune || "",
      products,
      quantities,
      order.totalPrice,
      capitalize(order.status),
      order.notes || "",
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
