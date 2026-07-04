import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import s from "./landing.module.css";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "🗺️", title: "Trips & itineraries", body: "Build night-by-night self-drive routes, flag hotel gaps, track holds before they expire, and manage your car fleet with per-driver costs.", wide: true },
  { icon: "🧾", title: "Bookings as invoices", body: "Land / visa / flight line items with automatic GST + TCS, discounts, and per-traveller extras — the maths matches your accountant’s sheet." },
  { icon: "💸", title: "Payments & collections", body: "Log installments, see who owes what, and let customers self-report payments via a shareable link you approve." },
  { icon: "🛂", title: "Visa desk", body: "Send travellers one form; get back a tailored Schengen cover letter and document checklist, with appointment tracking." },
  { icon: "📊", title: "Live profit analytics", body: "Revenue, cost, profit, margin and outstanding — recomputed instantly across every trip, with charts that actually mean something." },
  { icon: "🏢", title: "Multi-tenant by design", body: "Every company gets its own private, isolated workspace. Sign up, get approved, and your data is yours alone.", wide: true },
];

const STEPS = [
  { n: "STEP 01", title: "Create your workspace", body: "Sign up with your agency name. We review and switch it on — usually fast." },
  { n: "STEP 02", title: "Add trips & bookings", body: "Import an itinerary from Excel or type bookings in plain English. Customers, payments and taxes file themselves." },
  { n: "STEP 03", title: "Run the whole show", body: "Watch profit, chase outstanding balances, book hotels before holds lapse, and process visas — all from one desk." },
];

const KPIS = [
  { l: "Revenue booked", v: "₹66.3L", f: "+ GST/TCS billed ₹71L", c: "#a78bfa" },
  { l: "Your cost", v: "₹47.3L", f: "hotels · cars · drivers", c: "#22d3ee" },
  { l: "Profit", v: "₹18.9L", f: "29% margin", c: "#8b7bff" },
  { l: "Outstanding", v: "₹63.4L", f: "due from customers", c: "#4f6bff" },
];
const BARS = [62, 88, 45, 74, 96, 58, 80];

export default async function Landing() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className={s.wrap}>
      <div className={s.aurora} aria-hidden>
        <div className={`${s.blob} ${s.b1}`} />
        <div className={`${s.blob} ${s.b2}`} />
        <div className={`${s.blob} ${s.b3}`} />
      </div>
      <div className={s.grid} aria-hidden />
      <div className={s.noise} aria-hidden />

      {/* Nav */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <div className={s.brand}><span>✦</span> Trip Desk</div>
          <div className={s.navLinks}>
            <Link href="#features" className={`${s.navLink} ${s.hideSm}`}>Features</Link>
            <Link href="#how" className={`${s.navLink} ${s.hideSm}`}>How it works</Link>
            <Link href="/login" className={`${s.btn} ${s.ghost}`}>Sign in</Link>
            <Link href="/signup" className={`${s.btn} ${s.primary}`}>Start free →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className={s.shell}>
        <div className={s.hero}>
          <div className={`${s.eyebrow} ${s.up}`}><span className={s.dotlive} /> Now multi-tenant · built for self-drive tour operators</div>
          <h1 className={`${s.h1} ${s.up}`} style={{ animationDelay: "0.05s" }}>
            Run your whole travel company from <span className={s.gradtext}>one desk.</span>
          </h1>
          <p className={`${s.sub} ${s.up}`} style={{ animationDelay: "0.12s" }}>
            Trips, itineraries, bookings, GST/TCS invoicing, payments, visas and profit — every moving part of a group-tour business in a single, beautifully fast dashboard.
          </p>
          <div className={`${s.ctaRow} ${s.up}`} style={{ animationDelay: "0.18s" }}>
            <Link href="/signup" className={`${s.btn} ${s.primary} ${s.big}`}>Create your workspace</Link>
            <Link href="/login" className={`${s.btn} ${s.ghost} ${s.big}`}>Sign in</Link>
          </div>
          <div className={`${s.trust} ${s.up}`} style={{ animationDelay: "0.24s" }}>Free to start · approval in hours · your data stays yours</div>
        </div>

        {/* Mock dashboard */}
        <div className={`${s.visual} ${s.up}`} style={{ animationDelay: "0.3s" }}>
          <div className={s.glow} aria-hidden />
          <div className={s.mock}>
            <div className={s.mockBar}>
              <span className={s.tl} style={{ background: "#ff5f57" }} />
              <span className={s.tl} style={{ background: "#febc2e" }} />
              <span className={s.tl} style={{ background: "#28c840" }} />
              <span style={{ marginLeft: 10, fontSize: 12, color: "#8a90b8" }}>Iceland Ring Road · Dashboard</span>
            </div>
            <div className={s.mockBody}>
              <div className={s.kpis}>
                {KPIS.map((k) => (
                  <div className={s.kpi} key={k.l}>
                    <div className={s.kl}>{k.l}</div>
                    <div className={s.kv} style={{ color: k.c }}>{k.v}</div>
                    <div className={s.kf}>{k.f}</div>
                  </div>
                ))}
              </div>
              <div className={s.chart}>
                <div style={{ fontSize: 12.5, color: "#8a90b8" }}>Revenue by trip</div>
                <div className={s.bars}>
                  {BARS.map((h, i) => (
                    <div key={i} className={s.bar} style={{ height: `${h}%`, animationDelay: `${0.4 + i * 0.08}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className={s.section} id="features">
        <div className={s.shell}>
          <div className={s.kicker}>Everything, in one place</div>
          <h2 className={s.h2}>The back office your tour business deserves</h2>
          <p className={s.lead}>No more spreadsheets, WhatsApp threads and guesswork. Trip Desk holds the whole operation — and does the maths for you.</p>
          <div className={s.bento}>
            {FEATURES.map((f) => (
              <div key={f.title} className={`${s.card} ${f.wide ? s.wide : ""}`}>
                <div className={s.ico}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={s.section} id="how">
        <div className={s.shell}>
          <div className={s.kicker}>How it works</div>
          <h2 className={s.h2}>Live in three steps</h2>
          <div className={s.steps}>
            {STEPS.map((st) => (
              <div key={st.n} className={s.step}>
                <div className={s.snum}>{st.n}</div>
                <h3>{st.title}</h3>
                <p>{st.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className={s.band}>
        <h2>Give your operation a home.</h2>
        <p>Set up your company workspace in minutes. We’ll switch it on and you’ll never chase a spreadsheet again.</p>
        <div className={s.ctaRow} style={{ marginTop: 26 }}>
          <Link href="/signup" className={`${s.btn} ${s.primary} ${s.big}`}>Start free →</Link>
          <Link href="/login" className={`${s.btn} ${s.ghost} ${s.big}`}>Sign in</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footInner}>
          <div className={s.brand} style={{ fontSize: 15 }}><span>✦</span> Trip Desk</div>
          <div className={s.footMut}>© 2026 Trip Desk · Built for tour operators</div>
          <Link href="/admin/login" className={s.adminLink}>🛡️ Platform admin</Link>
        </div>
      </footer>
    </div>
  );
}
