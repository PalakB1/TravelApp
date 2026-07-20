import { prisma } from "@/lib/db";
import { getScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

// Streams an expense's uploaded invoice file. Auth + org/trip scoped — the file
// only leaves the DB for someone who may see that expense.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getScope();
  if (!scope) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const where = scope.tripIds
    ? { id, orgId: scope.orgId, tripId: { in: scope.tripIds } }
    : { id, orgId: scope.orgId };
  const exp = await prisma.expense.findFirst({ where, select: { fileData: true, fileName: true, fileType: true } });
  if (!exp?.fileData) return new Response("Not found", { status: 404 });

  // Stored as "data:<mime>;base64,<payload>".
  const comma = exp.fileData.indexOf(",");
  const b64 = comma >= 0 ? exp.fileData.slice(comma + 1) : exp.fileData;
  const bytes = Buffer.from(b64, "base64");
  const name = (exp.fileName || "invoice").replace(/[\r\n"]/g, "");

  return new Response(bytes, {
    headers: {
      "Content-Type": exp.fileType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${name}"`,
      "Content-Length": String(bytes.length),
    },
  });
}
