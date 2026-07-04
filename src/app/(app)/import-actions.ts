"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/lib/org";
import { parseAmount } from "@/lib/money";

export type ImportResult = { ok: boolean; message: string };

// Find the first row value whose header matches any of the given keywords.
function pick(row: Record<string, unknown>, keys: string[], keywords: string[]): unknown {
  for (const k of keys) {
    const norm = k.toLowerCase();
    if (keywords.some((w) => norm.includes(w))) return row[k];
  }
  return undefined;
}

function toDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    // Excel serial date → JS Date
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(v) : null;
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const parsed = new Date(String(v));
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function importItinerary(formData: FormData): Promise<ImportResult> {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) return { ok: false, message: "Please sign in again." };

  const tripId = String(formData.get("tripId") || "");
  const file = formData.get("file");
  if (!tripId) return { ok: false, message: "Missing trip." };
  // Only import into a trip that belongs to the current org.
  const ownsTrip = await prisma.trip.findFirst({ where: { id: tripId, orgId: ctx.orgId }, select: { id: true } });
  if (!ownsTrip) return { ok: false, message: "Trip not found." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an Excel file first." };

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { ok: false, message: "That file has no sheets." };

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    if (rows.length === 0) return { ok: false, message: "No rows found in the sheet." };

    const headers = Object.keys(rows[0]);
    const hasNamedCols = headers.some((h) => /date|day|location|city|stay|place|night|town|destination/i.test(h));

    const nights: { date: Date | null; location: string; hotelName: string | null; rooms: number; cost: number }[] = [];

    for (const row of rows) {
      let date: Date | null, location: string, hotel: unknown, rooms: unknown, cost: unknown;
      if (hasNamedCols) {
        date = toDate(pick(row, headers, ["date", "day"]));
        location = String(pick(row, headers, ["location", "city", "stay", "place", "night", "town", "destination"]) ?? "").trim();
        hotel = pick(row, headers, ["hotel", "property", "accommodation"]);
        rooms = pick(row, headers, ["room"]);
        cost = pick(row, headers, ["cost", "price", "amount", "rate"]);
      } else {
        // Positional fallback: A=date, B=location, C=hotel, D=rooms, E=cost
        const vals = headers.map((h) => row[h]);
        date = toDate(vals[0]);
        location = String(vals[1] ?? "").trim();
        hotel = vals[2];
        rooms = vals[3];
        cost = vals[4];
      }
      if (!location) continue;
      nights.push({
        date,
        location,
        hotelName: hotel ? String(hotel).trim() : null,
        rooms: Number(rooms) || 0,
        cost: parseAmount(cost == null ? "" : String(cost)),
      });
    }

    if (nights.length === 0) {
      return { ok: false, message: "Couldn't find any locations. Make sure a column holds the place you stay each night." };
    }

    // Replace the current itinerary with the imported one.
    await prisma.night.deleteMany({ where: { tripId } });
    await prisma.$transaction(
      nights.map((n, i) =>
        prisma.night.create({
          data: {
            tripId,
            order: i,
            date: n.date,
            location: n.location,
            hotels: n.hotelName
              ? { create: [{ hotelName: n.hotelName, rooms: n.rooms, cost: n.cost, status: "hold" }] }
              : undefined,
          },
        })
      )
    );

    revalidatePath("/", "layout");
    const gaps = nights.filter((n) => !n.hotelName).length;
    return {
      ok: true,
      message: `Imported ${nights.length} nights${gaps ? ` · ${gaps} still need a hotel` : " · all have a hotel"}.`,
    };
  } catch (e) {
    console.error("import error", e);
    return { ok: false, message: "Couldn't read that file. Is it a valid .xlsx?" };
  }
}
