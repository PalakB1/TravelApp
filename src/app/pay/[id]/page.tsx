import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { bookingTotal, bookingPaid, bookingBalance } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import PayForm from "./PayForm";

export const dynamic = "force-dynamic";

export default async function PublicPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.booking.findUnique({
    where: { id },
    include: { trip: { select: { name: true, destination: true } }, payments: true },
  });
  if (!b) notFound();

  const total = bookingTotal(b);
  const paid = bookingPaid(b);
  const balance = bookingBalance(b);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 460, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0, marginBottom: 4 }}>
          <span className="dot">✦</span> Trip Desk
        </div>
        <h1 style={{ fontSize: 20, marginTop: 6 }}>Confirm your payment</h1>
        <p className="muted small" style={{ marginTop: 4 }}>Hi {b.customerName} — for <b>{b.trip.name}</b>{b.trip.destination ? ` (${b.trip.destination})` : ""}.</p>

        <div className="metrics" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 16, marginBottom: 18 }}>
          <div className="metric c-violet"><div className="label">Invoice</div><div className="value" style={{ fontSize: 17 }}>{formatINR(total)}</div></div>
          <div className="metric c-emerald"><div className="label">Paid</div><div className="value" style={{ fontSize: 17 }}>{formatINR(paid)}</div></div>
          <div className={`metric ${balance > 0 ? "c-rose" : "c-emerald"}`}><div className="label">Balance</div><div className="value" style={{ fontSize: 17 }}>{formatINR(balance)}</div></div>
        </div>

        <PayForm bookingId={b.id} customerName={b.customerName} suggested={balance > 0 ? balance : undefined} />
      </div>
    </div>
  );
}
