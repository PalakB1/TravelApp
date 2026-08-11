"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import s from "./landing.module.css";
import { captureLead } from "./lead-actions";
import { COUNTRIES, countryPreset } from "@/lib/countries";
import { formatMoneyShort } from "@/lib/money";
import Logo from "@/components/Logo";

const FEATURES = [
  { icon: "⚡", title: "Quick entry", body: "Log a payment, expense, booking, hotel or whole trip from any screen in seconds — or just type “Riya paid 40k upi”. Nothing waits for later, so there's no month-end catch-up.", wide: true },
  { icon: "◈", title: "Reminders that write themselves", body: "Set your terms once. One tap opens WhatsApp with the amount, the due date and a link to confirm." },
  { icon: "🧾", title: "Invoices & receipts", body: "Sequential, gap-free tax invoices as PDFs. Branded receipts sent the moment money lands." },
  { icon: "🗺", title: "Reuse a whole itinerary", body: "Copy last season's route onto new dates — nights, hotels and pricing come across, dates shifted." },
  { icon: "🛏", title: "Rooms costed per night", body: "Late joiners and early leavers drop off the nights they aren't there, so you book what you need." },
  { icon: "✎", title: "Custom trips", body: "Bespoke, à-la-carte itineraries priced line by line — flights, hotels, rail, activities — each with its own cost, sell and tax." },
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
// Raw numbers; the currency is applied at render so they follow the visitor's
// country. Deliberately a coherent set — cost + profit really do sum to revenue.
const KPIS = [
  { l: "Revenue booked", v: 1240000, f: (t: string) => `+ ${t} billed on top`, c: "var(--accent)" },
  { l: "Your cost", v: 848000, f: () => "incl. rooms still to book", c: "var(--ice)" },
  { l: "Profit", v: 392000, f: () => "32% margin", c: "var(--magma)" },
  { l: "Overdue", v: 302000, f: () => "24 customers to chase", c: "var(--accent2)" },
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
  // Every figure and tax name on this page is an example, so show it in the
  // visitor's own money. India by default — that's where most of them are — and
  // the choice is remembered, because nobody wants to set it twice.
  const [country, setCountry] = useState("IN");
  useEffect(() => {
    // Deferred a tick rather than set in the effect body: the server renders
    // India, and switching state synchronously here forces a second render
    // before the first has painted.
    const t = setTimeout(() => {
      try {
        const saved = localStorage.getItem("tz-country");
        if (saved) setCountry(saved);
      } catch { /* storage blocked — India it is */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const pickCountry = (code: string) => {
    setCountry(code);
    try { localStorage.setItem("tz-country", code); } catch { /* not fatal */ }
  };
  const c = countryPreset(country);
  const cfg = { currency: c.currency, locale: c.locale };
  const mShort = (n: number) => formatMoneyShort(n, cfg);

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
            <Link href="#tax" className={`${s.navLink} ${s.hideSm}`}>Tax</Link>
            <Link href="/demo" className={`${s.navLink} ${s.hideSm}`}>Demo</Link>
            <Link href="#pricing" className={`${s.navLink} ${s.hideSm}`}>Pricing</Link>
            <Link href="/guides" className={`${s.navLink} ${s.hideSm}`}>Guides</Link>
            <select
              className={`${s.countryPick} ${s.hideSm}`}
              value={country}
              onChange={(e) => pickCountry(e.target.value)}
              aria-label="Show prices and taxes for"
              title="Show every figure on this page in your own currency"
            >
              {COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.code} · {x.currency}</option>)}
            </select>
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
            <Link href="#tax" className={s.mobileLink} onClick={() => setMenuOpen(false)}>Tax</Link>
            <Link href="/demo" className={s.mobileLink} onClick={() => setMenuOpen(false)}>Live demo</Link>
            <Link href="#pricing" className={s.mobileLink} onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link href="/guides" className={s.mobileLink} onClick={() => setMenuOpen(false)}>Guides</Link>
            <label className={s.mobileLink} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span>Show figures in</span>
              <select className={s.countryPick} value={country} onChange={(e) => pickCountry(e.target.value)} aria-label="Show prices and taxes for">
                {COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.code} · {x.currency}</option>)}
              </select>
            </label>
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
            TripZei runs the money side of a tour operation — {c.taxLabel}{c.taxLabel2 ? ` and ${c.taxLabel2}` : ""} invoicing with
            gap-free serials, payment plans that chase themselves on WhatsApp, room-by-room costing, and
            profit per trip that updates as you go. Stop finding out what a trip made after everyone has flown home.
          </p>
          <form action={captureLead} className={`${s.emailForm} ${s.up}`} style={{ animationDelay: "0.18s" }}>
            <div className={s.emailWrap}>
              <input className={s.emailInput} name="email" type="email" required placeholder="you@company.com" aria-label="Your work email" />
              <button type="submit" className={`${s.btn} ${s.primary}`}>Start free →</button>
            </div>
            <Link href="/login" className={`${s.btn} ${s.ghost} ${s.big}`}>Sign in</Link>
          </form>
          <p className={`${s.sub} ${s.up}`} style={{ animationDelay: "0.21s", fontSize: 14.5, marginTop: 14 }}>
            Not ready to sign up? <Link href="/demo" className={s.link}>Open the live demo</Link> — a real workspace with three trips already in it.
          </p>
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
                    <div className={s.kv} style={{ color: k.c }}>{mShort(k.v)}</div>
                    <div className={s.kf}>{k.f(mShort(84000))}</div>
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

      {/* THE WEDGE. One idea, explained properly, directly under the hero. A
          feature tile saying "honest profit" is a slogan; the mechanic is what
          makes an operator believe it. */}
      <section className={s.section} id="honest">
        <div className={s.shell}>
          <div className={s.kicker}>The difference</div>
          <h2 className={s.h2}>Your margin, <em>before</em> the bills arrive</h2>
          <p className={s.lead}>
            Most software shows profit as money in minus money out. Early in a trip that number is
            always flattering, because the rooms you haven&apos;t booked yet have cost you nothing yet.
            Then the supplier invoices land and the margin quietly halves.
          </p>
          <div className={s.proof}>
            <div className={s.proofCard}>
              <div className={s.proofNum}>{mShort(392000)}</div>
              <div className={s.proofLbl}>What TripZei shows</div>
              <p>
                Every unbooked room is priced in at your own average rate for that trip, so the
                figure already assumes the nights still to source.
              </p>
            </div>
            <div className={s.proofCard}>
              <div className={s.proofNum} style={{ color: "var(--muted2)", textDecoration: "line-through" }}>{mShort(631000)}</div>
              <div className={s.proofLbl}>What a spreadsheet shows</div>
              <p>
                The same trip, two weeks in, counting only what&apos;s been paid so far. Comfortable,
                and wrong by {mShort(239000)}.
              </p>
            </div>
          </div>
          <p className={s.lead} style={{ marginTop: 20, fontSize: 15 }}>
            When the real invoice arrives you mark it paid, the estimate is replaced by the actual,
            and the trip reconciles line by line — so you can see where a trip drifted, not just that it did.
          </p>
        </div>
      </section>

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

      {/* TAX. For an Indian operator this is a top-three reason to buy, and it
          used to be three words inside a feature tile. The wording follows the
          country picker, so a UK visitor reads VAT throughout. */}
      <section className={s.section} id="tax">
        <div className={s.shell}>
          <div className={s.kicker}>Tax, done properly</div>
          <h2 className={s.h2}>{c.taxLabel} invoices that <em>survive an audit</em></h2>
          <p className={s.lead}>
            Tax is the part everyone postpones and nobody enjoys reconstructing in March.
            TripZei issues it correctly as you go, in {c.name}&apos;s own terms.
          </p>
          <div className={s.details}>
            <div className={s.detail}><span className={s.detailMark}>✓</span><p>
              <b>Gap-free serial numbers, per financial year.</b> Numbering restarts each year and never skips —
              and if you void an invoice, the number is released rather than left as a hole in the run.
            </p></div>
            <div className={s.detail}><span className={s.detailMark}>✓</span><p>
              <b>{c.taxIdLabel}, registered address and SAC code</b> on every invoice, filled from your profile
              once instead of retyped per booking.
            </p></div>
            {c.taxLabel2 ? (
              <div className={s.detail}><span className={s.detailMark}>✓</span><p>
                <b>{c.taxLabel2} charged on value plus {c.taxLabel}</b> — the order Indian tour billing actually
                requires, not tax on tax done backwards.
              </p></div>
            ) : (
              <div className={s.detail}><span className={s.detailMark}>✓</span><p>
                <b>One clean {c.taxLabel} line at your rate.</b> No Indian CGST/SGST split on an invoice
                that shouldn&apos;t have one.
              </p></div>
            )}
            <div className={s.detail}><span className={s.detailMark}>✓</span><p>
              <b>A remittance register.</b> Tax collected, tax already paid to the government, and what&apos;s
              still owed — per trip and per quarter, so filing is reading rather than rebuilding.
            </p></div>
          </div>
        </div>
      </section>

      {/* PROOF. Four specifics beat ten feature names: an operator recognises
          their own week in these and stops needing to be sold to. */}
      <section className={s.section} id="proof">
        <div className={s.shell}>
          <div className={s.kicker}>Details that matter</div>
          <h2 className={s.h2}>Written by someone who&apos;s <em>run the trip</em></h2>
          <div className={s.details}>
            <div className={s.detail}><span className={s.detailMark}>›</span><p>
              A guest who checks out on the 4th <b>doesn&apos;t occupy the night of the 4th</b>. Rooms are counted
              per night, so late joiners and early leavers stop inflating what you book.
            </p></div>
            <div className={s.detail}><span className={s.detailMark}>›</span><p>
              A hotel <b>hold expiring in three days</b> is on the dashboard before it lapses — not discovered
              the week of departure when the rate has moved.
            </p></div>
            <div className={s.detail}><span className={s.detailMark}>›</span><p>
              Cut a booking&apos;s price after its payment plan was built and <b>the plan is capped at the invoice</b>.
              Nobody who has paid in full is ever shown as owing you money.
            </p></div>
            <div className={s.detail}><span className={s.detailMark}>›</span><p>
              One supplier bill covering three nights is entered <b>once</b>, ticked against all three, and split
              by what each was estimated to cost — so the trip still reconciles night by night.
            </p></div>
            <div className={s.detail}><span className={s.detailMark}>›</span><p>
              Money a colleague paid from their own pocket is <b>a loan on your books</b>, listed against their name
              until a transfer clears it — not lost in a category called Miscellaneous.
            </p></div>
            <div className={s.detail}><span className={s.detailMark}>›</span><p>
              Mark a hotel paid and <b>the expense writes itself</b>, asking only which account it left.
              Logging the spend was the step that always got skipped.
            </p></div>
          </div>
          <div className={s.ctaRow} style={{ marginTop: 30 }}>
            <Link href="/demo" className={`${s.btn} ${s.primary} ${s.big}`}>See all of it in the live demo →</Link>
          </div>
          <p className={s.lead} style={{ marginTop: 14, fontSize: 14 }}>
            A real workspace with three trips already in it. No signup, no card, no call.
          </p>
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
          <h2 className={s.h2}>Free while we&apos;re <em>young</em></h2>
          <p className={s.lead}>
            The whole product, every feature, no card and no trial clock. We&apos;d rather learn what
            it&apos;s worth by watching agencies use it than guess at a number today.
          </p>
          <p className={s.lead} style={{ marginTop: 12 }}>
            We will charge eventually — that&apos;s how this survives. When we do you&apos;ll get plenty of
            notice and a founding-agency price that stays put, and your data is yours to export either way.
          </p>
          <form action={captureLead} className={s.emailForm} style={{ marginTop: 22 }}>
            <div className={s.emailWrap}>
              <input className={s.emailInput} name="email" type="email" required placeholder="you@youragency.com" aria-label="Your work email" />
              <button type="submit" className={`${s.btn} ${s.primary}`}>Create your workspace →</button>
            </div>
            <Link href="/demo" className={`${s.btn} ${s.ghost} ${s.big}`}>Try the demo first</Link>
          </form>
        </div>
      </section>

      <section className={s.band}>
        <h2>Stop guessing what a trip <span className={`${s.accent} ${s.serif}`}>actually made.</span></h2>
        <p>Set up your workspace in minutes. Load one live trip and you&apos;ll see its true margin, who still owes you, and every room left to book — on day one.</p>
        <div className={s.ctaRow} style={{ marginTop: 28 }}>
          <Link href="/signup" className={`${s.btn} ${s.primary} ${s.big}`}>Start free →</Link>
          <Link href="/demo" className={`${s.btn} ${s.ghost} ${s.big}`}>See the live demo</Link>
        </div>
      </section>

      {/* Trust. A B2B buyer checks who they'd be handing their client list to
          before they check the features, and there was no entity and no way to
          reach a human anywhere on the page. */}
      <footer className={s.footer}>
        <div className={s.footCols}>
          <div>
            <Link href="/" className={s.brand} style={{ fontSize: 15 }} aria-label="TripZei home"><Logo height={24} /></Link>
            <p className={s.footMut} style={{ marginTop: 12, maxWidth: "34ch" }}>
              Back-office software for tour operators and travel agencies. Built in India, used anywhere.
            </p>
          </div>
          <div className={s.footCol}>
            <div className={s.footHd}>Product</div>
            <Link href="#features" className={s.footLink}>Features</Link>
            <Link href="#tax" className={s.footLink}>Tax &amp; invoicing</Link>
            <Link href="/pricing" className={s.footLink}>Pricing</Link>
            <Link href="/demo" className={s.footLink}>Live demo</Link>
            <Link href="/guides" className={s.footLink}>Guides</Link>
          </div>
          <div className={s.footCol}>
            <div className={s.footHd}>Talk to us</div>
            <a href="mailto:hello@tripzei.com" className={s.footLink}>hello@tripzei.com</a>
            <Link href="/signup" className={s.footLink}>Create a workspace</Link>
            <Link href="/login" className={s.footLink}>Sign in</Link>
          </div>
        </div>
        <div className={s.footIn} style={{ borderTop: "1px solid var(--line)", paddingTop: 18, marginTop: 26 }}>
          <div className={s.footMut}>© 2026 TripZei · All amounts shown are illustrative</div>
          <Link href="/admin/login" className={s.adminLink}>◆ Platform admin</Link>
        </div>
      </footer>
    </div>
  );
}
