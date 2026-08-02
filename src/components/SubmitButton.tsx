"use client";

import { useFormStatus } from "react-dom";

// A submit button that knows when its form is in flight: it disables itself and
// shows a working label. Without this a slow connection looks like nothing
// happened, and a second tap records the same payment/expense twice.
export default function SubmitButton({
  children,
  pendingLabel,
  className = "primary",
  style,
  title,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      style={style}
      title={title}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
