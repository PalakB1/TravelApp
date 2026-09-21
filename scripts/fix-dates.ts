import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// Existing rows were stored as instants. Anything not already sitting at UTC
// midnight was entered by someone in India, so its intended calendar day is its
// day in Asia/Kolkata. Re-pin each one to UTC midnight of that day.
const istDay = (d: Date) => {
  const s = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
  return new Date(`${s}T00:00:00.000Z`);
};
const needsFix = (d: Date) => d.getTime() !== istDay(d).getTime();
const day = (d: Date) => d.toISOString().slice(0, 10);

type Tbl = { name: string; field: string; rows: { id: string; v: Date | null }[] };

async function main() {
  const tables: Tbl[] = [
    { name: "Payment", field: "date", rows: (await prisma.payment.findMany({ select: { id: true, date: true } })).map((r) => ({ id: r.id, v: r.date })) },
    { name: "Expense", field: "date", rows: (await prisma.expense.findMany({ select: { id: true, date: true } })).map((r) => ({ id: r.id, v: r.date })) },
    { name: "Trip.departureDate", field: "departureDate", rows: (await prisma.trip.findMany({ select: { id: true, departureDate: true } })).map((r) => ({ id: r.id, v: r.departureDate })) },
    { name: "Trip.endDate", field: "endDate", rows: (await prisma.trip.findMany({ select: { id: true, endDate: true } })).map((r) => ({ id: r.id, v: r.endDate })) },
    { name: "Night.date", field: "date", rows: (await prisma.night.findMany({ select: { id: true, date: true } })).map((r) => ({ id: r.id, v: r.date })) },
    { name: "PaymentScheduleItem.dueDate", field: "dueDate", rows: (await prisma.paymentScheduleItem.findMany({ select: { id: true, dueDate: true } })).map((r) => ({ id: r.id, v: r.dueDate })) },
    { name: "Booking.freeCancelUntil", field: "freeCancelUntil", rows: (await prisma.booking.findMany({ select: { id: true, freeCancelUntil: true } })).map((r) => ({ id: r.id, v: r.freeCancelUntil })) },
    { name: "Settlement.date", field: "date", rows: (await prisma.settlement.findMany({ select: { id: true, date: true } })).map((r) => ({ id: r.id, v: r.date })) },
  ];

  let totalShift = 0, totalTouch = 0;
  for (const t of tables) {
    const bad = t.rows.filter((r) => r.v && needsFix(r.v!));
    const dayChanges = bad.filter((r) => day(r.v!) !== day(istDay(r.v!)));
    totalTouch += bad.length; totalShift += dayChanges.length;
    console.log(`${t.name.padEnd(28)} ${String(t.rows.filter((r) => r.v).length).padStart(4)} dated · ${String(bad.length).padStart(3)} to re-pin · ${String(dayChanges.length).padStart(3)} actually change day`);
    for (const r of dayChanges.slice(0, 3)) console.log(`      ${day(r.v!)} -> ${day(istDay(r.v!))}`);

    if (APPLY && bad.length) {
      for (const r of bad) {
        // @ts-expect-error dynamic model access, intentional for a one-off
        await prisma[t.name.split(".")[0].charAt(0).toLowerCase() + t.name.split(".")[0].slice(1)]
          .update({ where: { id: r.id }, data: { [t.field]: istDay(r.v!) } });
      }
    }
  }
  console.log(`\n${totalTouch} rows would be re-pinned; ${totalShift} of them currently DISPLAY the wrong day.`);
  console.log(APPLY ? "APPLIED." : "Dry run — nothing changed. Re-run with --apply to write.");
}
main().finally(() => prisma.$disconnect());
