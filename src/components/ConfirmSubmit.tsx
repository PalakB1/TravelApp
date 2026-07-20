"use client";

// A submit button that asks for confirmation before letting the form's server
// action run. Used for irreversible actions (permanent delete).
export default function ConfirmSubmit({ message, className, children, style }: { message: string; className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}
    >
      {children}
    </button>
  );
}
