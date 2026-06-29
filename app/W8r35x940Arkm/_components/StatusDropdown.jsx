"use client";

const OPTIONS = ["Pending", "Confirmed", "Shipped", "Cancelled"];

export default function StatusDropdown({ value, onChange }) {
  return (
    <select
      value={capitalize(value)}
      onChange={(e) => onChange(e.target.value.toLowerCase())}
      className="text-sm rounded-md border border-gray-300 bg-white px-2 py-1 outline-none focus:ring-2 focus:ring-gray-400"
    >
      {OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function capitalize(str) {
  if (!str) return "Pending";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
