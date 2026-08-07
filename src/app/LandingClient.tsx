"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import s from "./landing.module.css";
import { captureLead } from "./lead-actions";
import Logo from "@/components/Logo";

const FEATURES = [
  { icon: "⚡", title: "Quick entry", body: "Log a payment, expense, booking, hotel or whole trip from any screen in seconds — or just type “Riya paid 40k upi”. Nothing waits for later, so there's no month-end catch-up.", wide: true },
  { icon: "◈", title: "Reminders that write themselves", body: "Set your terms once. One tap opens WhatsApp with the amount, the due date and a link to confirm." },
  { icon: "🧾", title: "Invoices & receipts", body: "Sequential, gap-free tax invoices as PDFs. Branded receipts sent the moment money lands." },
  { icon: "🗺", title: "Reuse a whole itinerary", body: "Copy last season's route onto new dates — nights, hotels and pricing come across, dates shifted." },
  { icon: "🛏", title: "Rooms costed per night", body: "Late joiners and early leavers drop off the nights they aren't there, so you book what you need." },
  { icon: "▚", title: "Honest profit", body: "Rooms you haven't sourced yet are priced in, so the margin on screen is the one you'll bank." },
  { icon: "🎁", title: "Inclusions", body: "Define the package once — breakfast, permits, transfers — and every booking prices it per person." },
  { icon: "💸", title: "Costs & reimbursements", body: "Supplier bills tagged to a trip, invoice attached. Staff spends settled together with the reference." },
  { icon: "⌖", title: "Visa desk", body: "One link to travellers; a cover letter and checklist back, with status tracked per booking." },
  { icon: "🔒", title: "Your client list stays yours", body: "Customers, pricing and margins are sealed to your agency. Your team sees everything; nobody outside sees anything.", wide: true },
];
const LEGS = [
  { n: "01", title: "Tell us about your agency", body: "Sign up with your company name. We review it and switch your workspace on — usually within hours." },
  { n: "02", title: "Set your terms once", body: "Your payment plan, cancellation policy, tax details and logo. Every booking you make from then on inherits them." },
  { n: "03", title: "Run every trip from one desk", body: "Bookings, rooms, payments, supplier costs, invoices and visas — with profit updating as you go." },
];
const KPIS = [
  { l: "Revenue booked", v: "1.24M", f: "+ tax 84K billed", c: "var(--accent)" },
  { l: "Your cost", v: "848K", f: "incl. rooms still to book", c: "var(--ice)" },
  { l: "Profit", v: "392K", f: "32% margin", c: "var(--magma)" },
  { l: "Overdue", v: "302K", f: "24 customers to chase", c: "var(--accent2)" },
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Share the app's theme rather than keeping a separate landing-only one: a
  // visitor who picks dark here stays in dark after signing in, and vice versa.
  // Falls back to the device setting when nothing has been chosen.
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" || saved === "light"
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    // localStorage and matchMedia don't exist during server rendering, so the
    // stored choice can only be read once mounted — hence setting state here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(isDark);
  }, []);

  function toggle() {
    setDark((d) => {
      const next = !d;
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      } catch {}
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
          <Link href="/" className={s.brand} aria-label="TripZei home"><Logo height={30} /></Link>
          <div className={s.navLinks}>
            <Link href="#features" className={`${s.navLink} ${s.hideSm}`}>Features</Link>
            <Link href="#how" className={`${s.navLink} ${s.hideSm}`}>How it works</Link>
            <Link href="#pricing" className={`${s.navLink} ${s.hideSm}`}>Pricing</Link>
            <Link href="/guides" className={`${s.navLink} ${s.hideSm}`}>Guides</Link>
            <button type="button" className={s.toggle} onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? "☀" : "☾"}
            </button>
            <Link href="/login" className={`${s.btn} ${s.ghost} ${s.hideSm}`}>Sign in</Link>
            <Link href="/signup" className={`${s.btn} ${s.primary} ${s.hideSm}`}>Start free</Link>
            {/* Phone: one burger instead of six cramped controls. */}
            <button
              type="button"
              className={s.burger}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className={s.mobileMenu}>
            <Link href="#features" className={s.mobileLink} onClick={() => setMenuOpen(false)}>Features</Link>
            <Link href="#how" className={s.mobileLink} onClick={() => setMenuOpen(false)}>How it works</Link>
            <Link href="#pricing" className={s.mobileLink} onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link href="/guides" className={s.mobileLink} onClick={() => setMenuOpen(false)}>Guides</Link>
            <div className={s.mobileActions}>
              <Link href="/login" className={`${s.btn} ${s.ghost}`} onClick={() => setMenuOpen(false)}>Sign in</Link>
              <Link href="/signup" className={`${s.btn} ${s.primary}`} onClick={() => setMenuOpen(false)}>Start free</Link>
            </div>
          </div>
        )}
      </nav>

      <header className={s.shell}>
        <div className={s.hero}>
          <div className={`${s.eyebrow} ${s.up}`}><span className={s.pin} /> For tour operators &amp; travel agencies</div>
          <h1 className={`${s.h1} ${s.up}`} style={{ animationDelay: "0.05s" }}>
            Run the trip. <span className={`${s.accent} ${s.serif}`}>Keep the margin.</span>
          </h1>
          <p className={`${s.sub} ${s.up}`} style={{ animationDelay: "0.12s" }}>
            TripZei runs the money side of a travel business — invoicing, payment plans that chase themselves on WhatsApp, room-by-room costing and live profit per trip. Stop finding out what a trip made after everyone has flown home.
          </p>
          <form action={captureLead} className={`${s.emailForm} ${s.up}`} style={{ animationDelay: "0.18s" }}>
            <div className={s.emailWrap}>
              <input className={s.emailInput} name="email" type="email" required placeholder="you@company.com" aria-label="Your work email" />
              <button type="submit" className={`${s.btn} ${s.primary}`}>Start free →</button>
            </div>
            <Link href="/login" className={`${s.btn} ${s.ghost} ${s.big}`}>Sign in</Link>
          </form>
          <div className={`${s.trust} ${s.up}`} style={{ animationDelay: "0.24s" }}>
            <span><b>Free</b> to start</span><span>Live in <b>hours</b></span><span>Your client list stays <b>yours</b></span>
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
          <div className={s.kicker}>Built around the money</div>
          <h2 className={s.h2}>Built for the way you <em>actually work</em></h2>
          <p className={s.lead}>Not a filing cabinet you have to feed. Log things as they happen — in seconds, from anywhere — and the money side keeps itself straight: who owes you, what a trip really costs, and what you actually made.</p>
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

      <section className={s.section} id="how">
        <div className={s.shell}>
          <div className={s.kicker}>Getting started</div>
          <h2 className={s.h2}>Running in <em>three steps</em></h2>
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

      <section className={s.section} id="pricing">
        <div className={s.shell}>
          <div className={s.kicker}>Pricing</div>
          <h2 className={s.h2}>Priced around <em>your operation</em></h2>
          <p className={s.lead}>
            A two-person agency running four group departures a year shouldn&apos;t pay what a company
            running forty does. Tell us roughly how many trips and people you handle and we&apos;ll come
            back with a straight answer — no call required unless you want one.
          </p>
          <form action={captureLead} className={s.emailForm} style={{ marginTop: 22 }}>
            <div className={s.emailWrap}>
              <input className={s.emailInput} name="email" type="email" required placeholder="you@youragency.com" aria-label="Your work email" />
              <button type="submit" className={`${s.btn} ${s.primary}`}>Get a quote →</button>
            </div>
          </form>
          <p className={s.lead} style={{ marginTop: 14, fontSize: 14 }}>
            You can also start free and talk to us later — nothing is charged while you try it.
          </p>
        </div>
      </section>

      <section className={s.band}>
        <h2>Stop guessing what a trip <span className={`${s.accent} ${s.serif}`}>actually made.</span></h2>
        <p>Set up your workspace in minutes. Load one live trip and you&apos;ll see its true margin, who still owes you, and every room left to book — on day one.</p>
        <div className={s.ctaRow} style={{ marginTop: 28 }}>
          <Link href="/signup" className={`${s.btn} ${s.primary} ${s.big}`}>Start free →</Link>
          <Link href="/login" className={`${s.btn} ${s.ghost} ${s.big}`}>Sign in</Link>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.footIn}>
          <Link href="/" className={s.brand} style={{ fontSize: 15 }} aria-label="TripZei home"><Logo height={24} /></Link>
          <div className={s.footMut}>© 2026 TripZei · Built for tour operators &amp; travel agencies</div>
          <Link href="/admin/login" className={s.adminLink}>◆ Platform admin</Link>
        </div>
      </footer>
    </div>
  );
}
