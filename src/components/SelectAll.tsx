"use client";

// A header checkbox that toggles every row checkbox (name="ids") in its form.
export default function SelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      style={{ width: 16, height: 16 }}
      onChange={(e) => {
        const form = e.currentTarget.closest("form");
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => (c.checked = e.currentTarget.checked));
      }}
    />
  );
}
