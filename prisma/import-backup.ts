// Imports a backup JSON (from the backup script) into the current database.
// Usage: npx tsx prisma/import-backup.ts backups/backup-XXXX.json
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

// Convert ISO date strings back into Date objects so Prisma accepts them.
function revive<T>(rows: T[]): T[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
    for (const [k, v] of Object.entries(out)) {
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) out[k] = new Date(v);
    }
    return out as T;
  });
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Pass the backup file path, e.g. backups/backup-XXXX.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as Record<string, any[]>;

  // Order matters (parents before children).
  const steps: [string, (rows: any[]) => Promise<unknown>][] = [
    ["users", (r) => prisma.user.createMany({ data: revive(r), skipDuplicates: true })],
    ["customers", (r) => prisma.customer.createMany({ data: revive(r), skipDuplicates: true })],
    ["trips", (r) => prisma.trip.createMany({ data: revive(r), skipDuplicates: true })],
    ["variants", (r) => prisma.variant.createMany({ data: revive(r), skipDuplicates: true })],
    ["inclusions", (r) => prisma.inclusion.createMany({ data: revive(r), skipDuplicates: true })],
    ["nights", (r) => prisma.night.createMany({ data: revive(r), skipDuplicates: true })],
    ["hotelBookings", (r) => prisma.hotelBooking.createMany({ data: revive(r), skipDuplicates: true })],
    ["cars", (r) => prisma.car.createMany({ data: revive(r), skipDuplicates: true })],
    ["bookings", (r) => prisma.booking.createMany({ data: revive(r), skipDuplicates: true })],
    ["payments", (r) => prisma.payment.createMany({ data: revive(r), skipDuplicates: true })],
    ["travellers", (r) => prisma.traveller.createMany({ data: revive(r), skipDuplicates: true })],
    ["vendorBookings", (r) => prisma.vendorBooking.createMany({ data: revive(r), skipDuplicates: true })],
  ];

  for (const [name, fn] of steps) {
    const rows = data[name] || [];
    if (rows.length) await fn(rows);
    console.log(`imported ${name}: ${rows.length}`);
  }
  console.log("Import complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
