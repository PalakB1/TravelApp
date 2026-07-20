"use client";

// A trigger that opens the global Quick-entry panel from anywhere (dashboard,
// sidebar, bottom bar). Decoupled via a window event the launcher listens for.
export function openQuickEntry() {
  window.dispatchEvent(new Event("open-quick-entry"));
}

export default function QuickAddButton({ className = "", style, children, ariaLabel }: { className?: string; style?: React.CSSProperties; children: React.ReactNode; ariaLabel?: string }) {
  return (
    <button type="button" className={className} style={style} onClick={openQuickEntry} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
