import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import VisaForm from "@/components/VisaForm";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// The agency's permanent visa link.
//
// One URL, handed to a corporate client or put in a WhatsApp broadcast, and any
// number of travellers can fill it without anything being set up first — no
// trip, no booking, no account. They name the country they want to go to and the
// form rearranges itself around that answer; the application lands on the
// agency's Visa desk with its own document list.
//
// `?country=Malta` pre-selects a destination, for when the agency already knows
// where this particular group is going.
export default async function AgencyVisaFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ country?: string }>;
}) {
  const { org: orgId } = await params;
  const { country } = await searchParams;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, status: true },
  });
  // A suspended or rejected agency's link stops working, like every other
  // customer-facing page of theirs.
  if (!org || org.status === "rejected" || org.status === "suspended") notFound();

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: "24px 16px" }}>
      <div className="card" style={{ width: 640, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0, marginBottom: 4 }}><Logo /></div>
        <h1 style={{ fontSize: 20, marginTop: 6 }}>Visa application — {org.name}</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          Fill this once and you&apos;ll get the exact list of documents <i>you</i>{" "}need, and nothing you don&apos;t.
          Start with where you&apos;re going — the questions change to match the country, your work and who&apos;s
          paying, so you&apos;re only asked what applies to you. Please copy your name and passport details exactly
          as they are printed.
        </p>
        <VisaForm orgId={org.id} visaCountry={(country || "").trim()} />
      </div>
    </div>
  );
}
