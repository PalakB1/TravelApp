import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { demoLogin } from "@/app/login/actions";
import { DEMO_EMAIL, DEMO_PASSWORD, isDemoUser } from "@/lib/demo";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// Only reached when someone who is already signed in follows a /demo link.
// The button posts a Server Action, which is allowed to write the session
// cookie — the route handler next door covers the signed-out case in one hop.
export default async function DemoSwitchPage() {
  const session = await getSession();
  if (!session || isDemoUser(session.email)) redirect("/demo");

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 420, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0 }}><Logo /></div>
        <h1 style={{ fontSize: 19, marginTop: 6 }}>Open the demo workspace?</h1>
        <p className="muted small" style={{ marginTop: 8 }}>
          You&apos;re signed in as <b>{session.name}</b>. Opening the demo signs you out of your own
          workspace — your data is untouched, and you can sign back in whenever you like.
        </p>
        <form action={demoLogin} style={{ marginTop: 16 }}>
          <button className="primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
            Open the demo
          </button>
        </form>
        <Link className="btn sm" href="/dashboard" style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          No, stay where I am
        </Link>
        <p className="small muted" style={{ marginTop: 14, textAlign: "center", fontSize: 11.5 }}>
          Demo login: <b>{DEMO_EMAIL}</b> / <b>{DEMO_PASSWORD}</b>
        </p>
      </div>
    </div>
  );
}
