"use client";

import { useEffect, useState } from "react";

// Shows a shareable absolute URL (built from the current origin) with a copy button.
export default function CopyLink({ path, label = "Copy" }: { path: string; label?: string }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setUrl(window.location.origin + path); }, [path]);

  return (
    <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ maxWidth: 340, fontSize: 12.5 }} />
      <button
        type="button"
        className="sm"
        onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }}
      >
        {copied ? "Copied ✓" : label}
      </button>
    </div>
  );
}
