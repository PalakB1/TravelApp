"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { importItinerary, type ImportResult } from "@/app/(app)/import-actions";

export default function ImportItinerary({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file || busy) return;
    setBusy(true);
    setResult(null);
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("file", file);
    try {
      const res = await importItinerary(fd);
      setResult(res);
      if (res.ok) {
        router.refresh();
        if (inputRef.current) inputRef.current.value = "";
        setFileName("");
      }
    } catch {
      setResult({ ok: false, message: "Upload failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-box" style={{ marginTop: 0 }}>
      <div className="flex" style={{ flexWrap: "wrap", gap: 10 }}>
        <label className="btn sm" style={{ cursor: "pointer" }}>
          {fileName || "Choose Excel file"}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          />
        </label>
        <button className="primary sm" type="submit" disabled={busy || !fileName}>
          {busy ? "Importing…" : "Import itinerary"}
        </button>
        <a className="small" style={{ color: "var(--accent)" }} href="/api/itinerary-template">Download template</a>
      </div>
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        Columns: <b>Date</b>, <b>Location</b> (where they sleep), and optionally Hotel, Rooms, Cost. Importing replaces the current itinerary.
      </p>
      {result && (
        <p className="small" style={{ margin: "8px 0 0", color: result.ok ? "var(--success)" : "var(--danger)" }}>
          {result.message}
        </p>
      )}
    </form>
  );
}
