import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import VisaForm from "./VisaForm";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
}

export default async function VisaFormPage({ params, searchParams }: { params: Promise<{ tripId: string }>; searchParams: Promise<{ type?: string; country?: string }> }) {
  const { tripId } = await params;
  const { type, country } = await searchParams;
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true, name: true, destination: true, departureDate: true, endDate: true } });
  if (!trip) notFound();
  const dates = trip.departureDate ? `${fmt(trip.departureDate)}${trip.endDate ? " – " + fmt(trip.endDate) : ""}` : "";

  const visaType = type === "generic" ? "generic" : "schengen";
  const visaCountry = (country || "").trim();
  const label = visaType === "schengen" ? "Schengen" : (visaCountry || "Visitor");

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: "24px 16px" }}>
      <div className="card" style={{ width: 640, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0, marginBottom: 4 }}><span className="dot">✦</span> Trip Desk</div>
        <h1 style={{ fontSize: 20, marginTop: 6 }}>{label} visa details</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          For <b>{trip.name}</b>{trip.destination ? ` · ${trip.destination}` : ""}{dates ? ` · ${dates}` : ""}. Fill this once and we’ll generate your cover letter + document checklist. Please match your passport exactly.
        </p>
        <VisaForm tripId={trip.id} visaType={visaType} visaCountry={visaCountry} />
      </div>
    </div>
  );
}
