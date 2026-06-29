"use client";

// A button that collapses the nearest <details> it sits inside.
export default function CloseDetails({ label = "Close" }: { label?: string }) {
  return (
    <button
      type="button"
      className="sm"
      onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
    >
      {label}
    </button>
  );
}
