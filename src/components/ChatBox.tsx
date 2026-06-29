"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { interpretCommand, type ChatResult } from "@/app/(app)/chat-actions";

type Msg = { role: "user" | "bot" | "err"; text: string };

const SAMPLES = [
  "add trip Kerala Backwaters to Kerala, 6 nights",
  "add Anjali to Iceland 6 Oct, 2 pax",
  "Garima paid 50000 by bank",
];

export default function ChatBox() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: "Type a trip, booking, or payment in plain English and I’ll file it." },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(value: string) {
    const v = value.trim();
    if (!v || busy) return;
    setMsgs((m) => [...m, { role: "user", text: v }]);
    setText("");
    setBusy(true);
    try {
      const res: ChatResult = await interpretCommand(v);
      setMsgs((m) => [...m, { role: res.ok ? "bot" : "err", text: res.message }]);
      if (res.ok) router.refresh();
    } catch {
      setMsgs((m) => [...m, { role: "err", text: "Couldn’t reach the server. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="chat-msgs" style={{ maxHeight: 240, overflowY: "auto" }}>
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role === "user" ? "user" : m.role === "err" ? "err" : "bot"}`}>
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Riya paid 40k by upi"
          disabled={busy}
        />
        <button className="primary" type="submit" disabled={busy || !text.trim()}>
          {busy ? "…" : "Send"}
        </button>
      </form>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {SAMPLES.map((s) => (
          <button key={s} type="button" className="chip" style={{ cursor: "pointer" }} onClick={() => setText(s)} disabled={busy} title="Click to fill, then edit and send">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
