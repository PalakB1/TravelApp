"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { logout, exitOrgAction } from "@/app/(app)/actions";

// Mobile-only bottom tab bar (Paytm / MyGate style): four primary tabs + a
// "More" button that slides up a sheet with everything else. Hidden on desktop
// via CSS (the sidebar takes over there).
const PRIMARY = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/trips", label: "Trips", icon: "map" },
  { href: "/payments", label: "Pay", icon: "wallet" },
  { href: "/expenses", label: "Costing", icon: "coins" },
] as const;

function Icon({ name }: { name: string }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>,
    map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></>,
    wallet: <><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M21 12a2 2 0 0 0-2-2h-4a2 2 0 0 0 0 4h4a2 2 0 0 0 2-2z" /></>,
    coins: <><ellipse cx="8" cy="6" rx="6" ry="3" /><path d="M2 6v6c0 1.66 2.69 3 6 3s6-1.34 6-3V6" /><path d="M2 12v6c0 1.66 2.69 3 6 3 1.5 0 2.87-.28 3.9-.75" /><circle cx="17" cy="15" r="5" /></>,
    more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
    ticket: <><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 6 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-6z" /><line x1="13" y1="7" x2="13" y2="17" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    bed: <><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></>,
    compass: <><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></>,
    passport: <><rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M9 17h6" /></>,
    receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /></>,
    team: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M17 3.13a4 4 0 0 1 2 3.71" /><path d="M19 8h4" /><path d="M21 6v4" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H22a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
  };
  return <svg {...p}>{paths[name]}</svg>;
}

type Props = { isPlatformAdmin?: boolean; actingOrgId?: string | null; customTrips?: boolean; name: string };

export default function BottomNav({ isPlatformAdmin = false, actingOrgId = null, customTrips = false, name }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/dashboard" ? path === "/dashboard" : path.startsWith(href));

  const moreLinks = [
    { href: "/bookings", label: "Bookings", icon: "ticket" },
    { href: "/customers", label: "Customers", icon: "users" },
    { href: "/hotels", label: "Hotels", icon: "bed" },
    ...(customTrips ? [{ href: "/custom-trips", label: "Custom trips", icon: "compass" }] : []),
    { href: "/visas", label: "Visa desk", icon: "passport" },
    { href: "/tax", label: "GST / Tax", icon: "receipt" },
    { href: "/team", label: "Team", icon: "team" },
    { href: "/settings", label: "Settings", icon: "gear" },
    ...(isPlatformAdmin ? [{ href: "/admin", label: "Admin", icon: "shield" }] : []),
  ];

  // Any "more" destination active makes the More tab light up too.
  const moreActive = moreLinks.some((l) => isActive(l.href)) || open;

  return (
    <>
      {open && <div className="bn-backdrop" onClick={() => setOpen(false)} />}
      {open && (
        <div className="bn-sheet" role="dialog" aria-label="Menu">
          <div className="bn-grip" />
          <div className="bn-sheet-head">
            <span>Menu</span>
            <span className="small muted">{name}</span>
          </div>
          <div className="bn-grid">
            {moreLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`bn-tile ${isActive(l.href) ? "on" : ""}`}>
                <Icon name={l.icon} />
                <span>{l.label}</span>
              </Link>
            ))}
          </div>
          <div className="bn-sheet-foot">
            {actingOrgId && (
              <form action={exitOrgAction} style={{ flex: 1 }}>
                <button className="sm" type="submit" style={{ width: "100%", justifyContent: "center" }}>👁️ Exit client view</button>
              </form>
            )}
            <form action={logout} style={{ flex: 1 }}>
              <button className="sm" type="submit" style={{ width: "100%", justifyContent: "center" }}>Sign out</button>
            </form>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {PRIMARY.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={isActive(l.href) && !open ? "on" : ""}>
            <Icon name={l.icon} />
            <span>{l.label}</span>
          </Link>
        ))}
        <button type="button" className={moreActive ? "on" : ""} onClick={() => setOpen((v) => !v)} aria-label="More">
          <Icon name="more" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
