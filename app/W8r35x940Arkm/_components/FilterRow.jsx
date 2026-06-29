const FILTERS = ["All", "Pending", "Confirmed", "Shipped", "Cancelled"];

export default function FilterRow({ activeFilter, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter;
        return (
          <button
            key={filter}
            onClick={() => onChange(filter)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-black text-white"
                : "bg-gray-100 text-foreground hover:bg-gray-200"
            }`}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
