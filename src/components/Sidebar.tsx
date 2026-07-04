"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { logout, exitOrgAction } from "@/app/(app)/actions";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/trips", label: "Trips", icon: "map" },
  { href: "/hotels", label: "Hotels", icon: "bed" },
  { href: "/customers", label: "Customers", icon: "users" },
  { href: "/bookings", label: "Bookings", icon: "ticket" },
  { href: "/payments", label: "Payments", icon: "wallet" },
  { href: "/visas", label: "Visa desk", icon: "passport" },
  { href: "/tax", label: "GST / Tax", icon: "receipt" },
  { href: "/team", label: "Team", icon: "team" },
];

function Icon({ name }: { name: string }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
    map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></>,
    ticket: <><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 6 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-6z" /><line x1="13" y1="7" x2="13" y2="17" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /></>,
    wallet: <><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M21 12a2 2 0 0 0-2-2h-4a2 2 0 0 0 0 4h4a2 2 0 0 0 2-2z" /></>,
    bed: <><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></>,
    passport: <><rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M9 17h6" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
    team: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M17 3.13a4 4 0 0 1 2 3.71" /><path d="M19 8h4" /><path d="M21 6v4" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H22a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export default function Sidebar({ name, isPlatformAdmin = false, actingOrgId = null }: { name: string; isPlatformAdmin?: boolean; actingOrgId?: string | null }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/dashboard" ? path === "/dashboard" : path.startsWith(href));

  const closeMenu = (e: React.MouseEvent) => (e.currentTarget as HTMLElement).closest("details")?.removeAttribute("open");

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <span className="dot">✦</span> Trip Desk
        </div>
        {actingOrgId && (
          <form action={exitOrgAction} style={{ margin: "0 0 10px" }}>
            <button className="sm" style={{ width: "100%", justifyContent: "center", background: "var(--accent-bg)", borderColor: "transparent" }} type="submit" title="Return to the platform admin console">
              👁️ Viewing a client · Exit
            </button>
          </form>
        )}
        <nav className="nav">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""}>
              <Icon name={l.icon} />
              {l.label}
            </Link>
          ))}
          {isPlatformAdmin && (
            <Link href="/admin" className={isActive("/admin") ? "active" : ""}>
              <Icon name="shield" />
              Platform admin
            </Link>
          )}
        </nav>
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <p className="small muted" style={{ padding: "0 11px 8px" }}>Signed in as {name}</p>
          <Link href="/settings" className="sm" style={{ display: "flex", width: "100%", justifyContent: "center", marginBottom: 6 }}>Settings</Link>
          <form action={logout}>
            <button className="sm" style={{ width: "100%", justifyContent: "center" }} type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar — the sidebar is hidden on small screens */}
      <header className="mobile-topbar">
        <Link href="/dashboard" className="brand" style={{ padding: 0, fontSize: 16 }}><span className="dot">✦</span> Trip Desk</Link>
        <details className="mobile-menu">
          <summary className="btn sm" style={{ listStyle: "none", cursor: "pointer" }}>☰ Menu</summary>
          <nav className="mobile-nav">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={closeMenu} className={isActive(l.href) ? "active" : ""}>
                <Icon name={l.icon} />
                {l.label}
              </Link>
            ))}
            {isPlatformAdmin && (
              <Link href="/admin" onClick={closeMenu} className={isActive("/admin") ? "active" : ""}>
                <Icon name="shield" />
                Platform admin
              </Link>
            )}
            {actingOrgId && (
              <form action={exitOrgAction} style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 6 }}>
                <button className="sm" style={{ width: "100%", justifyContent: "center" }} type="submit">👁️ Viewing a client · Exit</button>
              </form>
            )}
            <Link href="/settings" onClick={closeMenu} className={isActive("/settings") ? "active" : ""} style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 6 }}>
              <Icon name="gear" />
              Settings
            </Link>
            <form action={logout} style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 6 }}>
              <button className="sm" style={{ width: "100%", justifyContent: "center" }} type="submit">Sign out</button>
            </form>
          </nav>
        </details>
      </header>
    </>
  );
}
