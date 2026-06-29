const STAT_DEFS = [
  { key: "total", label: "Total Orders" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "cancelled", label: "Cancelled" },
];

export default function StatsBar({ orders }) {
  const counts = orders.reduce(
    (acc, order) => {
      const status = (order.status || "pending").toLowerCase();
      if (acc[status] !== undefined) acc[status] += 1;
      return acc;
    },
    { pending: 0, confirmed: 0, shipped: 0, cancelled: 0 },
  );
  counts.total = orders.length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {STAT_DEFS.map((stat, i) => (
        <div
          key={stat.key}
          className={
            i === STAT_DEFS.length - 1 ? "col-span-2 sm:col-span-1" : ""
          }
        >
          <div className="bg-gray-100 rounded-lg px-4 py-4 flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground tabular-nums">
              {counts[stat.key]}
            </span>
            <span className="text-sm text-gray-500">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
