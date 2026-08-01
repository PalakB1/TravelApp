"use client";

import { useEffect, useState } from "react";

type Mode = "auto" | "light" | "dark";

// Cycles Auto → Light → Dark. "Auto" follows the device; Light/Dark override it.
// The choice is stored in localStorage and re-applied before paint by the inline
// script in the root layout, so there's no flash on reload.
function apply(mode: Mode) {
  const el = document.documentElement;
  if (mode === "auto") {
    el.removeAttribute("data-theme");
    localStorage.removeItem("theme");
  } else {
    el.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
  }
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("auto");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme");
    setMode(saved === "light" || saved === "dark" ? saved : "auto");
  }, []);

  function cycle() {
    const next: Mode = mode === "auto" ? "light" : mode === "light" ? "dark" : "auto";
    setMode(next);
    apply(next);
  }

  // Render a neutral label until mounted to avoid a hydration mismatch.
  const icon = !mounted ? "🌗" : mode === "light" ? "☀️" : mode === "dark" ? "🌙" : "🌗";
  const label = !mounted ? "Theme" : mode === "light" ? "Light" : mode === "dark" ? "Dark" : "Auto";

  if (compact) {
    return (
      <button type="button" className="sm" onClick={cycle} title={`Theme: ${label} — tap to change`} aria-label={`Theme: ${label}`}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="sm"
      onClick={cycle}
      style={{ display: "flex", width: "100%", justifyContent: "center", marginBottom: 6 }}
      title="Switch between light, dark, and auto (follow device)"
    >
      <span style={{ marginRight: 6 }}>{icon}</span> Theme: {label}
    </button>
  );
}
