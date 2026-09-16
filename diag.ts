import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const mb = (b: number) => (b / 1048576).toFixed(2) + " MB";

async function main() {
  // How big is the data each page drags across the wire?
  const rows: { table: string; bytes: bigint }[] = await prisma.$queryRawUnsafe(`
    SELECT relname AS table, pg_total_relation_size(relid) AS bytes
    FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 8;`);
  console.log("biggest tables:");
  for (const r of rows) console.log(`  ${r.table.padEnd(20)} ${mb(Number(r.bytes))}`);

  // Base64 invoice uploads live in the Expense row itself.
  const f: { n: bigint; total: bigint | null; biggest: bigint | null }[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) FILTER (WHERE "fileData" IS NOT NULL) AS n,
           SUM(length("fileData")) AS total,
           MAX(length("fileData")) AS biggest FROM "Expense";`);
  console.log(`\nexpense attachments: ${f[0].n} files, ${mb(Number(f[0].total ?? 0))} total, biggest ${mb(Number(f[0].biggest ?? 0))}`);

  // Org logos are base64 too, and the layout reads the org on every page.
  const l: { n: bigint; total: bigint | null }[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) FILTER (WHERE logo IS NOT NULL) AS n, SUM(length(logo)) AS total FROM "Organization";`);
  console.log(`org logos: ${l[0].n}, ${mb(Number(l[0].total ?? 0))} total`);

  const s: { n: bigint; total: bigint | null }[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) FILTER (WHERE screenshot IS NOT NULL) AS n, SUM(length(screenshot)) AS total FROM "PendingPayment";`);
  console.log(`payment screenshots: ${s[0].n}, ${mb(Number(s[0].total ?? 0))} total`);

  // Round-trip cost of a single trivial query, from here.
  const t0 = Date.now(); await prisma.$queryRawUnsafe("SELECT 1"); const warm = Date.now() - t0;
  const t1 = Date.now(); await prisma.$queryRawUnsafe("SELECT 1"); const warm2 = Date.now() - t1;
  console.log(`\none round trip to Neon: ${warm}ms then ${warm2}ms`);
}
main().finally(() => prisma.$disconnect());
