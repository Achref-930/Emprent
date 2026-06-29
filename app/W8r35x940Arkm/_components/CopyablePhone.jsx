"use client";

import { useState } from "react";

export default function CopyablePhone({ phone }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(phone || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied or unavailable — fail silently
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleCopy}
        className="text-left hover:underline underline-offset-2"
        title="Click to copy"
      >
        {phone || "—"}
      </button>
      {copied && (
        <span className="absolute -top-7 left-0 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
          Copied
        </span>
      )}
    </div>
  );
}
