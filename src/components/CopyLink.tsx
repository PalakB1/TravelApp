"use client";

import { useEffect, useState } from "react";

// A shareable absolute URL with a tap-to-copy field, a native Share button
// (opens the phone's share sheet — WhatsApp, SMS, etc.), a Copy button with a
// clipboard fallback, and an optional direct WhatsApp share.
export default function CopyLink({
  path,
  label = "Copy",
  waPhone,
  waText,
  title = "Payment link",
}: {
  path: string;
  label?: string;
  waPhone?: string | null;
  waText?: string;
  title?: string;
}) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setUrl(window.location.origin + path);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [path]);

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for browsers that block the async clipboard API.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function doShare() {
    try {
      await navigator.share({ title, text: `${waText ? waText + " " : ""}${url}` });
    } catch { /* user cancelled the share sheet */ }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`${waText ? waText + " " : ""}${url}`);
    let digits = (waPhone || "").replace(/\D/g, "");
    if (digits.length === 10) digits = "91" + digits; // assume India for a bare 10-digit number
    const link = digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(link, "_blank", "noopener");
  }

  return (
    <div className="copylink">
      <div className="copylink-url" onClick={doCopy} title="Tap to copy">{url}</div>
      <div className="copylink-actions">
        {canShare && <button type="button" className="sm primary" onClick={doShare}>↗ Share</button>}
        <button type="button" className="sm" onClick={doCopy}>{copied ? "Copied ✓" : label}</button>
        {waText != null && <button type="button" className="sm copylink-wa" onClick={shareWhatsApp}>WhatsApp</button>}
      </div>
    </div>
  );
}
