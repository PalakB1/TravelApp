"use client";

import { useEffect, useState } from "react";

// Shows a shareable absolute URL (built from the current origin) with a copy
// button and an optional one-tap WhatsApp share (prefilled message + number).
export default function CopyLink({
  path,
  label = "Copy",
  waPhone,
  waText,
}: {
  path: string;
  label?: string;
  waPhone?: string | null;
  waText?: string;
}) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setUrl(window.location.origin + path); }, [path]);

  function shareWhatsApp() {
    const text = encodeURIComponent(`${waText ? waText + " " : ""}${url}`);
    let digits = (waPhone || "").replace(/\D/g, "");
    if (digits.length === 10) digits = "91" + digits; // assume India if a bare 10-digit number
    const link = digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(link, "_blank", "noopener");
  }

  return (
    <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ maxWidth: 300, fontSize: 12.5 }} />
      <button
        type="button"
        className="sm"
        onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }}
      >
        {copied ? "Copied ✓" : label}
      </button>
      {waText && (
        <button type="button" className="sm" onClick={shareWhatsApp} style={{ background: "#25D366", color: "#fff", borderColor: "transparent", fontWeight: 600 }}>
          ↗ WhatsApp
        </button>
      )}
    </div>
  );
}
