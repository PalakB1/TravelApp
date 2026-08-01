// One-time backfill: renumber every trip's itinerary nights so `order` follows
// the dates, fixing rows that were appended out of sequence before addNight
// started resequencing. Safe to re-run — it only writes when order changes.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const trips = await prisma.trip.findMany({ select: { id: true } });
  let tripsFixed = 0;
  let rowsFixed = 0;

  for (const trip of trips) {
    const nights = await prisma.night.findMany({
      where: { tripId: trip.id },
      select: { id: true, date: true, order: true, createdAt: true, location: true },
    });
    nights.sort((a, b) => {
      const at = a.date ? new Date(a.date).getTime() : Infinity;
      const bt = b.date ? new Date(b.date).getTime() : Infinity;
      if (at !== bt) return at - bt;
      if (a.order !== b.order) return a.order - b.order;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const updates = nights
      .map((n, i) => ({ id: n.id, from: n.order, to: i, location: n.location }))
      .filter((u) => u.from !== u.to);

    if (updates.length === 0) continue;

    await prisma.$transaction(
      updates.map((u) => prisma.night.update({ where: { id: u.id }, data: { order: u.to } })),
    );
    tripsFixed++;
    rowsFixed += updates.length;
    console.log(`Trip ${trip.id}: reordered ${updates.length} night(s)`);
    for (const u of updates) console.log(`  ${u.location}: order ${u.from} -> ${u.to}`);
  }

  console.log(`\nDone. ${rowsFixed} night(s) across ${tripsFixed} trip(s) resequenced.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
