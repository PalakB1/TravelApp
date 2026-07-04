import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireOrgId } from "@/lib/org";
import { pricePerRoom } from "@/lib/calc";

function d(date: Date | null) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const trip = await prisma.trip.findFirst({
    where: { id, orgId },
    include: { itinerary: { orderBy: { order: "asc" }, include: { hotels: true } } },
  });
  if (!trip) return new Response("Not found", { status: 404 });

  const header = ["Date", "Location", "Hotel", "Rooms", "Total cost", "Price/room", "Status", "Hold until", "Booked on", "Confirmation", "Notes"];
  const rows: (string | number)[][] = [header];
  let totalRooms = 0, totalCost = 0;

  for (const n of trip.itinerary) {
    if (n.hotels.length === 0) {
      rows.push([d(n.date), n.location, "— not booked —", 0, 0, 0, "unbooked", "", "", "", ""]);
      continue;
    }
    for (const h of n.hotels) {
      totalRooms += h.rooms;
      totalCost += h.cost;
      rows.push([d(n.date), n.location, h.hotelName, h.rooms, h.cost, pricePerRoom(h), h.status, d(h.holdUntil), h.source || "", h.confirmationNo || "", h.notes || ""]);
    }
  }
  rows.push(["", "", "TOTAL", totalRooms, totalCost, "", "", "", "", "", ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 26 }, { wch: 7 }, { wch: 12 }, { wch: 11 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rooming");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const safe = trip.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safe}-rooming.xlsx"`,
    },
  });
}
