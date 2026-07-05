"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import s from "./landing.module.css";
import { captureLead } from "./lead-actions";

const FEATURES = [
  { icon: "🗺", title: "Trips & itineraries", body: "Build night-by-night group routes — or fully bespoke, per-client trips. Flag hotel gaps, track holds before they expire, and manage your car fleet with per-driver costs.", wide: true },
  { icon: "🧾", title: "Bookings as invoices", body: "Land / visa / flight line items with automatic GST + TCS, discounts and per-traveller extras — the maths matches your accountant’s sheet." },
  { icon: "◈", title: "Payments & collections", body: "Log installments, see who owes what, and let customers self-report payments via a shareable link you approve." },
  { icon: "⌖", title: "Visa desk", body: "Send travellers one form; get back a tailored cover letter and document checklist — Schengen or any country — with appointment tracking." },
  { icon: "▚", title: "Live profit analytics", body: "Revenue, cost, profit, margin and outstanding — recomputed instantly across every trip, with charts that actually mean something." },
  { icon: "🔒", title: "Your clients stay your clients", body: "Your customer list, pricing and margins are sealed to your agency — never visible to any other agency on the platform. Your team sees everything; outsiders, nothing.", wide: true },
];
const LEGS = [
  { n: "01", title: "Chart your workspace", body: "Sign up with your agency name. We review it and switch it on — usually within hours." },
  { n: "02", title: "Load trips & bookings", body: "Import an itinerary from Excel or type bookings in plain English. Customers, payments and taxes file themselves." },
  { n: "03", title: "Run the whole route", body: "Track profit, chase balances, book hotels before holds lapse, and process visas — all from one desk." },
];
const KPIS = [
  { l: "Revenue booked", v: "₹66.3L", f: "+ GST/TCS billed ₹71L", c: "var(--accent)" },
  { l: "Your cost", v: "₹47.3L", f: "hotels · cars · drivers", c: "var(--ice)" },
  { l: "Profit", v: "₹18.9L", f: "29% margin", c: "#6d5cf0" },
  { l: "Outstanding", v: "₹63.4L", f: "due from customers", c: "var(--magma)" },
];
const BARS = [58, 84, 44, 72, 96, 60, 80];
const STOPS = [
  { x: 24, y: 96, lx: 24, name: "Reykjavík" },
  { x: 268, y: 44, lx: 268, name: "Vík" },
  { x: 512, y: 96, lx: 512, name: "Höfn" },
  { x: 730, y: 52, lx: 730, name: "Egilsstaðir" },
  { x: 968, y: 60, lx: 960, name: "Akureyri" },
];
const CONTOUR_YS = [90, 170, 250, 330, 410, 490, 570, 650];
function contour(y: number) {
  let d = `M0 ${y}`;
  for (let x = 0; x <= 1200; x += 120) d += ` Q ${x + 60} ${y - 22} ${x + 120} ${y}`;
  return d;
}

export default function LandingClient() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tripdesk-landing-theme");
    if (saved === "dark") setDark(true);
  }, []);

  function toggle() {
    setDark((d) => {
      const next = !d;
      try { localStorage.setItem("tripdesk-landing-theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  }

  return (
    <div className={`${s.wrap} ${dark ? s.dark : ""}`}>
      <div className={s.sky} aria-hidden>
        <div className={`${s.aur} ${s.aur1}`} />
        <div className={`${s.aur} ${s.aur2}`} />
        <div className={`${s.aur} ${s.aur3}`} />
      </div>
      <div className={s.contours} aria-hidden>
        <svg viewBox="0 0 1200 760" preserveAspectRatio="none">
          {CONTOUR_YS.map((y) => <path key={y} className={s.cline} d={contour(y)} />)}
        </svg>
      </div>
      <div className={s.grain} aria-hidden />

      <nav className={s.nav}>
        <div className={s.navIn}>
          <div className={s.brand}><span className={s.mark}>✦</span> Trip Desk</div>
          <div className={s.navLinks}>
            <Link href="#features" className={`${s.navLink} ${s.hideSm}`}>Features</Link>
            <Link href="#route" className={`${s.navLink} ${s.hideSm}`}>How it works</Link>
            <button type="button" className={s.toggle} onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? "☀" : "☾"}
            </button>
            <Link href="/login" className={`${s.btn} ${s.ghost}`}>Sign in</Link>
            <Link href="/signup" className={`${s.btn} ${s.primary}`}>Start free</Link>
          </div>
        </div>
      </nav>

      <header className={s.shell}>
        <div className={s.hero}>
          <div className={`${s.eyebrow} ${s.up}`}><span className={s.pin} /> Built for self-drive tour operators · now multi-tenant</div>
          <h1 className={`${s.h1} ${s.up}`} style={{ animationDelay: "0.05s" }}>
            Every mile of your trip business, <span className={`${s.accent} ${s.serif}`}>on one desk.</span>
          </h1>
          <p className={`${s.sub} ${s.up}`} style={{ animationDelay: "0.12s" }}>
            Trips, itineraries, bookings, GST/TCS invoicing, payments, visas and profit — the whole route of a group-tour business, mapped in one beautifully fast dashboard.
          </p>
          <form action={captureLead} className={`${s.emailForm} ${s.up}`} style={{ animationDelay: "0.18s" }}>
            <div className={s.emailWrap}>
              <input className={s.emailInput} name="email" type="email" required placeholder="you@company.com" aria-label="Your work email" />
              <button type="submit" className={`${s.btn} ${s.primary}`}>Start free →</button>
            </div>
            <Link href="/login" className={`${s.btn} ${s.ghost} ${s.big}`}>Sign in</Link>
          </form>
          <div className={`${s.trust} ${s.up}`} style={{ animationDelay: "0.24s" }}>
            <span><b>Free</b> to start</span><span><b>Approved</b> in hours</span><span>Your data stays <b>yours</b></span>
          </div>
        </div>

        <div className={`${s.route} ${s.up}`} id="route" style={{ animationDelay: "0.28s" }}>
          <svg viewBox="0 0 1000 150" role="img" aria-label="A self-drive route from Reykjavík to Akureyri">
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#12b487" /><stop offset="1" stopColor="#1aa0d0" />
              </linearGradient>
            </defs>
            <path className={s.trace} d="M24 96 C 150 30, 200 40, 268 44 S 430 120, 512 96 S 660 30, 730 52 S 900 78, 968 60" />
            <path className={s.dash} d="M24 96 C 150 30, 200 40, 268 44 S 430 120, 512 96 S 660 30, 730 52 S 900 78, 968 60" opacity="0.55" />
            {STOPS.map((p) => (
              <g key={p.name}>
                <circle className={s.stopDot} cx={p.x} cy={p.y} r="6" />
                <text className={s.stopLbl} x={p.lx} y={p.y + 26} textAnchor="middle">{p.name}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className={`${s.visual} ${s.up}`} style={{ animationDelay: "0.34s" }}>
          <div className={s.glow} aria-hidden />
          <div className={s.console}>
            <div className={s.cbar}>
              <span className={s.cdot} style={{ background: "#ef6a3d" }} />
              <span className={s.cdot} style={{ background: "#e6b53f" }} />
              <span className={s.cdot} style={{ background: "#0e9f74" }} />
              <span className={s.ctag}><b>Iceland Ring Road</b> · 12 nights · dashboard</span>
            </div>
            <div className={s.cbody}>
              <div className={s.kpis}>
                {KPIS.map((k) => (
                  <div className={s.kpi} key={k.l} style={{ "--bar": k.c } as React.CSSProperties}>
                    <div className={s.kl}>{k.l}</div>
                    <div className={s.kv} style={{ color: k.c }}>{k.v}</div>
                    <div className={s.kf}>{k.f}</div>
                  </div>
                ))}
              </div>
              <div className={s.panel}>
                <div className={s.panelHd}><span>Revenue by trip</span><span className={s.mono}>FY 25–26</span></div>
                <div className={s.bars}>
                  {BARS.map((h, i) => (
                    <div key={i} className={s.bar} style={{ height: `${h}%`, animationDelay: `${0.5 + i * 0.08}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className={s.section} id="features">
        <div className={s.shell}>
          <div className={s.kicker}>Everything, in one place</div>
          <h2 className={s.h2}>The back office your tour business <em>deserves</em></h2>
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

      <section className={s.section}>
        <div className={s.shell}>
          <div className={s.kicker}>The itinerary</div>
          <h2 className={s.h2}>Live in <em>three stops</em></h2>
          <div className={s.legs}>
            <div className={s.legLine} aria-hidden />
            <div className={s.legRow}>
              {LEGS.map((l) => (
                <div key={l.n} className={s.leg}>
                  <div className={s.legPin}>{l.n}</div>
                  <h3>{l.title}</h3>
                  <p>{l.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={s.band}>
        <h2>Give your operation a <span className={`${s.accent} ${s.serif}`}>home base.</span></h2>
        <p>Set up your company workspace in minutes. We’ll switch it on and you’ll never chase a spreadsheet again.</p>
        <div className={s.ctaRow} style={{ marginTop: 28 }}>
          <Link href="/signup" className={`${s.btn} ${s.primary} ${s.big}`}>Start free →</Link>
          <Link href="/login" className={`${s.btn} ${s.ghost} ${s.big}`}>Sign in</Link>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.footIn}>
          <div className={s.brand} style={{ fontSize: 15 }}><span className={s.mark}>✦</span> Trip Desk</div>
          <div className={s.footMut}>© 2026 Trip Desk · Built for tour operators</div>
          <Link href="/admin/login" className={s.adminLink}>◆ Platform admin</Link>
        </div>
      </footer>
    </div>
  );
}
