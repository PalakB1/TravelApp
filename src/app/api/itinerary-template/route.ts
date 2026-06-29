import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Date", "Location", "Hotel", "Rooms", "Cost"],
    ["2026-09-12", "Reykjavik", "Centerhotel Þingholt", 6, 180000],
    ["2026-09-13", "Selfoss", "", 6, ""],
    ["2026-09-14", "Vík", "Hotel Vík í Mýrdal", 6, 165000],
    ["2026-09-15", "Höfn", "", 6, ""],
  ]);
  ws["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 26 }, { wch: 8 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Itinerary");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="itinerary-template.xlsx"',
    },
  });
}
