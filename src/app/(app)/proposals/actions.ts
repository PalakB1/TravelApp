"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getScope } from "@/lib/scope";
import { parseAmount } from "@/lib/money";

const str = (v: FormDataEntryValue | null) => String(v || "").trim() || null;
const num = (v: FormDataEntryValue | null) => Math.max(0, parseInt(String(v || "0"), 10) || 0);

// Only this org's proposals.
const own = (orgId: string, id: string) => prisma.proposal.findFirst({ where: { id, orgId }, select: { id: true } });

export async function createProposal() {
  const scope = await getScope();
  if (!scope) redirect("/login");
  const p = await prisma.proposal.create({ data: { orgId: scope.orgId, title: "Untitled proposal" } });
  redirect(`/proposals/${p.id}`);
}

export async function updateProposal(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");
  const id = String(formData.get("id"));
  if (!(await own(scope.orgId, id))) { revalidatePath("/proposals"); return; }
  const startStr = str(formData.get("startDate"));
  await prisma.proposal.updateMany({
    where: { id, orgId: scope.orgId },
    data: {
      title: String(formData.get("title") || "").trim() || "Untitled proposal",
      destination: str(formData.get("destination")),
      customerName: str(formData.get("customerName")),
      customerPhone: str(formData.get("customerPhone")),
      startDate: startStr ? new Date(startStr) : null,
      nights: num(formData.get("nights")),
      pax: Math.max(1, num(formData.get("pax")) || 1),
      heroNote: str(formData.get("heroNote")),
      priceAmount: parseAmount(String(formData.get("priceAmount") || "0")),
      pricePerPerson: String(formData.get("pricePerPerson")) === "on",
      inclusions: str(formData.get("inclusions")),
      exclusions: str(formData.get("exclusions")),
      terms: str(formData.get("terms")),
    },
  });
  revalidatePath(`/proposals/${id}`);
  revalidatePath("/proposals");
}

export async function setProposalStatus(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");
  const id = String(formData.get("id"));
  const status = String(formData.get("status") || "draft");
  if (!["draft", "sent", "accepted", "declined"].includes(status)) return;
  if (!(await own(scope.orgId, id))) return;
  await prisma.proposal.updateMany({ where: { id, orgId: scope.orgId }, data: { status } });
  revalidatePath(`/proposals/${id}`);
  revalidatePath("/proposals");
}

export async function deleteProposal(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");
  const id = String(formData.get("id"));
  if (!(await own(scope.orgId, id))) redirect("/proposals");
  await prisma.proposal.delete({ where: { id } });
  redirect("/proposals");
}

// ---- itinerary days ----
export async function addProposalDay(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");
  const proposalId = String(formData.get("proposalId"));
  if (!(await own(scope.orgId, proposalId))) { revalidatePath("/proposals"); return; }
  const last = await prisma.proposalDay.findFirst({ where: { proposalId }, orderBy: { order: "desc" }, select: { order: true } });
  await prisma.proposalDay.create({
    data: {
      proposalId,
      title: String(formData.get("title") || "").trim(),
      description: str(formData.get("description")),
      order: (last?.order ?? -1) + 1,
    },
  });
  revalidatePath(`/proposals/${proposalId}`);
}

export async function updateProposalDay(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");
  const id = String(formData.get("id"));
  const day = await prisma.proposalDay.findFirst({ where: { id, proposal: { orgId: scope.orgId } }, select: { proposalId: true } });
  if (!day) { revalidatePath("/proposals"); return; }
  await prisma.proposalDay.update({
    where: { id },
    data: { title: String(formData.get("title") || "").trim(), description: str(formData.get("description")) },
  });
  revalidatePath(`/proposals/${day.proposalId}`);
}

export async function deleteProposalDay(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");
  const id = String(formData.get("id"));
  const day = await prisma.proposalDay.findFirst({ where: { id, proposal: { orgId: scope.orgId } }, select: { proposalId: true } });
  if (!day) { revalidatePath("/proposals"); return; }
  await prisma.proposalDay.delete({ where: { id } });
  revalidatePath(`/proposals/${day.proposalId}`);
}
