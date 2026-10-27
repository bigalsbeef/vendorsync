"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DOCUMENT_TYPE_KEYS } from "@/lib/document-types";
import { parseCents } from "@/lib/format";

const opt = (max = 200) => z.string().trim().max(max).optional().transform((v) => v || null);

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  portalAccountId: opt(),
  contactName: opt(), contactEmail: opt(), contactPhone: opt(40), apEmail: opt(),
  invoiceMethod: z.enum(["PORTAL", "EMAIL", "MAIL", "OTHER"]),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(30),
  vendorNumber: opt(60),
  notes: opt(2000),
  active: z.coerce.boolean().default(true),
});

async function ownPortal(vendorId: string, id: string | null) {
  if (!id) return null;
  const p = await prisma.portalAccount.findFirst({ where: { id, vendorId } });
  return p?.id ?? null;
}

export async function createCustomer(formData: FormData) {
  const user = await requireUser();
  const d = customerSchema.parse({ ...Object.fromEntries(formData), active: formData.get("active") === "on" || !formData.has("active") });
  const requirementTypes = formData.getAll("requirements").map(String).filter((t) => DOCUMENT_TYPE_KEYS.includes(t as never));
  const customer = await prisma.customer.create({
    data: {
      vendorId: user.vendorId,
      ...d,
      portalAccountId: await ownPortal(user.vendorId, d.portalAccountId),
      requirements: { create: requirementTypes.map((documentType) => ({ documentType })) },
    },
  });
  await prisma.activity.create({ data: { vendorId: user.vendorId, kind: "INFO", message: `Added customer ${customer.name}`, href: `/customers/${customer.id}` } });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.customer.findFirstOrThrow({ where: { id, vendorId: user.vendorId } });
  const d = customerSchema.parse({ ...Object.fromEntries(formData), active: formData.get("active") === "on" });
  await prisma.customer.update({ where: { id }, data: { ...d, portalAccountId: await ownPortal(user.vendorId, d.portalAccountId) } });
  revalidatePath(`/customers/${id}`); revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.customer.deleteMany({ where: { id, vendorId: user.vendorId } });
  revalidatePath("/customers");
  redirect("/customers");
}

// ----- requirements -----

const reqSchema = z.object({
  customerId: z.string().min(1),
  documentType: z.enum(DOCUMENT_TYPE_KEYS as [string, ...string[]]),
  minCoverage: z.string().optional(),
  additionalInsured: z.coerce.boolean().default(false),
  notes: opt(500),
});

export async function addRequirement(formData: FormData) {
  const user = await requireUser();
  const d = reqSchema.parse({ ...Object.fromEntries(formData), additionalInsured: formData.get("additionalInsured") === "on" });
  await prisma.customer.findFirstOrThrow({ where: { id: d.customerId, vendorId: user.vendorId } });
  await prisma.complianceRequirement.upsert({
    where: { customerId_documentType: { customerId: d.customerId, documentType: d.documentType } },
    create: { customerId: d.customerId, documentType: d.documentType, minCoverageCents: d.minCoverage ? parseCents(d.minCoverage) : null, additionalInsured: d.additionalInsured, notes: d.notes },
    update: { minCoverageCents: d.minCoverage ? parseCents(d.minCoverage) : null, additionalInsured: d.additionalInsured, notes: d.notes },
  });
  revalidatePath(`/customers/${d.customerId}`);
}

export async function removeRequirement(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const r = await prisma.complianceRequirement.findFirst({ where: { id, customer: { vendorId: user.vendorId } } });
  if (!r) return;
  await prisma.complianceRequirement.delete({ where: { id } });
  revalidatePath(`/customers/${r.customerId}`);
}

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NOT_SUBMITTED", "SUBMITTED", "APPROVED", "REJECTED", "EXPIRED"]),
  rejectionReason: opt(500),
});

/** Records that we submitted the current best document, or what the customer said about it. */
export async function setRequirementStatus(formData: FormData) {
  const user = await requireUser();
  const d = statusSchema.parse(Object.fromEntries(formData));
  const r = await prisma.complianceRequirement.findFirst({ where: { id: d.id, customer: { vendorId: user.vendorId } }, include: { customer: true } });
  if (!r) return;
  let submittedDocumentId = r.submittedDocumentId;
  if (d.status === "SUBMITTED") {
    const best = await prisma.complianceDocument.findFirst({
      where: { vendorId: user.vendorId, documentType: r.documentType },
      orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }],
    });
    submittedDocumentId = best?.id ?? null;
  }
  await prisma.complianceRequirement.update({
    where: { id: d.id },
    data: {
      status: d.status,
      submittedDocumentId,
      submittedAt: d.status === "SUBMITTED" ? new Date() : r.submittedAt,
      reviewedAt: ["APPROVED", "REJECTED"].includes(d.status) ? new Date() : r.reviewedAt,
      rejectionReason: d.status === "REJECTED" ? d.rejectionReason : null,
    },
  });
  await prisma.activity.create({
    data: { vendorId: user.vendorId, kind: d.status === "REJECTED" || d.status === "EXPIRED" ? "WARNING" : "INFO", message: `${r.customer.name}: ${r.documentType.replace(/_/g, " ")} marked ${d.status.toLowerCase().replace("_", " ")}`, href: `/customers/${r.customerId}` },
  });
  revalidatePath(`/customers/${r.customerId}`); revalidatePath("/dashboard");
}

// ----- properties -----

const propSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().trim().min(1),
  address: opt(), city: opt(100), state: opt(20), zip: opt(20),
  unitCount: z.string().optional().transform((v) => (v ? Number(v) || null : null)),
});

export async function addProperty(formData: FormData) {
  const user = await requireUser();
  const d = propSchema.parse(Object.fromEntries(formData));
  await prisma.customer.findFirstOrThrow({ where: { id: d.customerId, vendorId: user.vendorId } });
  await prisma.property.create({ data: d });
  revalidatePath(`/customers/${d.customerId}`);
}

export async function removeProperty(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const p = await prisma.property.findFirst({ where: { id, customer: { vendorId: user.vendorId } } });
  if (!p) return;
  await prisma.property.delete({ where: { id } });
  revalidatePath(`/customers/${p.customerId}`);
}
