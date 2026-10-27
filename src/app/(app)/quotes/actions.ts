"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { parseAmount } from "@/lib/money";
import { orgMoney } from "@/lib/orgMoney";
import { financialYear } from "@/lib/invoice";
import { toDay } from "@/lib/dates";
import { logActivity } from "../data-actions";

const refresh = () => revalidatePath("/", "layout");
const str = (v: FormDataEntryValue | null) => String(v || "").trim() || null;

// A quotation belongs to the agency, not to a trip, even when it was started
// from one: you quote people who never book, for trips that never run, and the
// quote has to survive the trip being deleted.
async function own(quoteId: string) {
  const scope = await requireScope();
  const q = await prisma.quotation.findFirst({
    where: { id: quoteId, orgId: scope.orgId, deletedAt: null },
    select: { id: true, orgId: true, quoteNo: true, clientName: true },
  });
  return q ? { ...q, scope } : null;
}

export async function createQuotation(formData: FormData) {
  const scope = await requireScope();
  const clientName = String(formData.get("clientName") || "").trim();
  if (!clientName) return;

  const tripId = str(formData.get("tripId"));
  const trip = tripId
    ? await prisma.trip.findFirst({ where: { id: tripId, orgId: scope.orgId }, select: { id: true, name: true } })
    : null;

  const $ = await orgMoney();
  const q = await prisma.quotation.create({
    data: {
      orgId: scope.orgId,
      tripId: trip?.id ?? null,
      title: str(formData.get("title")) || (trip ? trip.name : "Trip quotation"),
      clientName,
      clientPhone: str(formData.get("clientPhone")),
      clientEmail: str(formData.get("clientEmail")),
      pax: Math.max(0, Number(formData.get("pax")) || 0),
      validUntil: toDay(String(formData.get("validUntil") || "")),
      // The rates are copied, not referenced: a quote sent in March still adds
      // up in June after a rate change.
      taxLabel: $.taxLabel,
      taxRate: $.taxRate,
    },
    select: { id: true },
  });
  await logActivity(scope.orgId, "booking", "added", `Started a quotation for ${clientName}`, `/quotes/${q.id}`);
  refresh();
  redirect(`/quotes/${q.id}`);
}

export async function updateQuotation(formData: FormData) {
  const id = String(formData.get("id"));
  const q = await own(id);
  if (!q) return;
  await prisma.quotation.update({
    where: { id },
    data: {
      title: str(formData.get("title")) || "Trip quotation",
      clientName: String(formData.get("clientName") || "").trim() || q.clientName,
      clientPhone: str(formData.get("clientPhone")),
      clientEmail: str(formData.get("clientEmail")),
      pax: Math.max(0, Number(formData.get("pax")) || 0),
      validUntil: toDay(String(formData.get("validUntil") || "")),
      notes: str(formData.get("notes")),
    },
  });
  refresh();
}

export async function addQuoteItem(formData: FormData) {
  const quotationId = String(formData.get("quotationId"));
  const q = await own(quotationId);
  if (!q) return;
  const label = String(formData.get("label") || "").trim();
  if (!label) return;
  const last = await prisma.quotationItem.findFirst({
    where: { quotationId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.quotationItem.create({
    data: {
      quotationId,
      label,
      detail: str(formData.get("detail")),
      qty: Math.max(0, Number(formData.get("qty")) || 1),
      // parseAmount handles "40k" and "1.2L"; a leading minus makes it a
      // discount line, which is how a discount should read on a quote.
      unitPrice: parseAmount(String(formData.get("unitPrice") || "")),
      taxable: String(formData.get("taxable") || "yes") === "yes",
      order: (last?.order ?? 0) + 1,
    },
  });
  refresh();
}

export async function deleteQuoteItem(formData: FormData) {
  const id = String(formData.get("id"));
  const scope = await requireScope();
  await prisma.quotationItem.deleteMany({
    where: { id, quotation: { orgId: scope.orgId } },
  });
  refresh();
}

// Sending is what turns a draft into a real document: it gets its number here,
// and not before, so abandoned drafts don't eat numbers out of the sequence.
export async function sendQuotation(formData: FormData) {
  const id = String(formData.get("id"));
  const q = await own(id);
  if (!q) return;

  let quoteNo = q.quoteNo;
  if (!quoteNo) {
    const fy = financialYear(new Date());
    const org = await prisma.organization.findUnique({
      where: { id: q.orgId },
      select: { name: true, legalName: true },
    });
    const prefix = (org?.legalName || org?.name || "QUO").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "QUO";
    const seq = await prisma.quoteSeq.upsert({
      where: { orgId_fy: { orgId: q.orgId, fy } },
      create: { orgId: q.orgId, fy, lastNo: 1 },
      update: { lastNo: { increment: 1 } },
      select: { lastNo: true },
    });
    quoteNo = `${prefix}/Q/${fy}/${String(seq.lastNo).padStart(4, "0")}`;
  }

  await prisma.quotation.update({ where: { id }, data: { quoteNo, status: "sent" } });
  await logActivity(q.orgId, "booking", "status", `Quotation ${quoteNo} ready for ${q.clientName}`, `/quotes/${id}`);
  refresh();
}

export async function setQuoteStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status") || "draft");
  const q = await own(id);
  if (!q) return;
  if (!["draft", "sent", "accepted", "declined"].includes(status)) return;
  await prisma.quotation.update({ where: { id }, data: { status } });
  await logActivity(q.orgId, "booking", "status", `Quotation for ${q.clientName} marked ${status}`, `/quotes/${id}`);
  refresh();
}

export async function deleteQuotation(formData: FormData) {
  const id = String(formData.get("id"));
  const q = await own(id);
  if (!q) return;
  await prisma.quotation.update({ where: { id }, data: { deletedAt: new Date() } });
  await logActivity(q.orgId, "booking", "deleted", `Deleted the quotation for ${q.clientName}`);
  refresh();
  redirect("/quotes");
}
