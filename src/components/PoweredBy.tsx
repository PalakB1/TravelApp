import Link from "next/link";

// A quiet line on the documents an agency's customers receive — invoices,
// receipts and payment pages. Those get forwarded to travellers, corporate
// clients and other agencies, which is exactly who we want to reach, so this is
// free targeted distribution rather than decoration.
//
// Deliberately understated: the agency's own branding leads, and this sits
// below the fold of attention. `hide` is set from the org's paid-tier flag.
export default function PoweredBy({ hide = false }: { hide?: boolean }) {
  if (hide) return null;
  return (
    <p
      className="small no-print"
      style={{ textAlign: "center", marginTop: 18, color: "var(--text-3)", fontSize: 12 }}
    >
      Powered by{" "}
      <Link
        href="https://tripzei.com"
        target="_blank"
        rel="noopener"
        style={{ color: "var(--text-2)", fontWeight: 600 }}
      >
        TripZei
      </Link>{" "}
      — trip, booking &amp; payment software for travel companies
    </p>
  );
}
