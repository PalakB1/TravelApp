import { demoLogin } from "@/app/login/actions";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

// The "see it before you commit" box, shown on sign in and sign up.
//
// It offers both routes on purpose: the button for anyone who just wants in,
// and the printed credentials for the buyer who wants to forward them to a
// colleague — that second person arrives without a link and needs to type.
export default function DemoCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        marginTop: 16, padding: compact ? "12px 14px" : 14, borderRadius: 12,
        border: "1px dashed var(--border-strong, var(--border))", background: "var(--surface-2)",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13.5 }}>Want a look around first?</div>
      <p className="small muted" style={{ margin: "4px 0 10px" }}>
        Open a fully loaded workspace — three trips, real bookings, payments and costing. Nothing to fill in.
      </p>
      <form action={demoLogin}>
        <button className="primary sm" type="submit" style={{ width: "100%", justifyContent: "center" }}>
          Open the demo workspace →
        </button>
      </form>
      <p className="small muted" style={{ margin: "9px 0 0", fontSize: 11.5, textAlign: "center" }}>
        or sign in with <b>{DEMO_EMAIL}</b> / <b>{DEMO_PASSWORD}</b>
      </p>
    </div>
  );
}
