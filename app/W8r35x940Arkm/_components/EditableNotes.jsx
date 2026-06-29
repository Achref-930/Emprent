"use client";

import { useState } from "react";

export default function EditableNotes({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  function startEdit() {
    setDraft(value || "");
    setEditing(true);
  }

  function handleBlur() {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value || "");
            setEditing(false);
          }
        }}
        className="w-full min-w-[140px] rounded-md border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-gray-400"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="text-left w-full min-w-[140px] text-sm text-foreground hover:bg-gray-100 rounded-md px-2 py-1 -mx-2 -my-1"
    >
      {value ? value : <span className="text-gray-400">Add note…</span>}
    </button>
  );
}
