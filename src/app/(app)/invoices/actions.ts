"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseCents } from "@/lib/format";
import { saveFile } from "@/lib/storage";
import { submitInvoice as runSubmit } from "@/connectors/run";

const opt = (max = 200) => z.string().trim().max(max).optional().transform((v) => v || null);
const schema = z.object({
  customerId: z.string().min(1),
  propertyId: opt(),
  invoiceNumber: z.string().trim().min(1),
  issueDate: z.string().min(1),
  dueDate: opt(20),
  description: opt(2000),
  poNumber: opt(60),
  workOrderNumber: opt(60),
  notes: opt(2000),
});

function lineItemsFrom(formData: FormData) {
  const descs = formData.getAll("li_description").map(String);
  const qtys = formData.getAll("li_quantity").map(String);
  const prices = formData.getAll("li_unitPrice").map(String);
  const items = descs
    .map((description, i) => {
      const quantity = Number(qtys[i] || 1) || 1;
      const unitPriceCents = parseCents(prices[i]);
      return { description: description.trim(), quantity, unitPriceCents, totalCents: Math.round(quantity * unitPriceCents), sortOrder: i };
    })
    .filter((li) => li.description);
  return items;
}

export async function createInvoice(formData: FormData) {
  const user = await requireUser();
  const d = schema.parse(Object.fromEntries(formData));
  const customer = await prisma.customer.findFirstOrThrow({ where: { id: d.customerId, vendorId: user.vendorId } });
  const propertyId = d.propertyId ? (await prisma.property.findFirst({ where: { id: d.propertyId, customerId: customer.id } }))?.id ?? null : null;
  const lineItems = lineItemsFrom(formData);
  const amountCents = lineItems.length ? lineItems.reduce((s, l) => s + l.totalCents, 0) : parseCents(String(formData.get("amount") ?? ""));
  const issueDate = new Date(d.issueDate);
  const dueDate = d.dueDate ? new Date(d.dueDate) : new Date(issueDate.getTime() + customer.paymentTermsDays * 86_400_000);
  const file = formData.get("file");
  const stored = file instanceof File && file.size > 0 ? await saveFile(user.vendorId, file) : null;

  const invoice = await prisma.invoice.create({
    data: {
      vendorId: user.vendorId, customerId: customer.id, propertyId,
      invoiceNumber: d.invoiceNumber, issueDate, dueDate, amountCents,
      description: d.description, poNumber: d.poNumber, workOrderNumber: d.workOrderNumber, notes: d.notes,
      status: "READY",
      ...(stored ? { fileName: stored.fileName, storageKey: stored.storageKey } : {}),
      lineItems: { create: lineItems },
    },
  });
  await prisma.activity.create({ data: { vendorId: user.vendorId, kind: "INFO", message: `Created invoice ${invoice.invoiceNumber} for ${customer.name}`, href: `/invoices/${invoice.id}` } });
  revalidatePath("/invoices"); revalidatePath("/dashboard");
  redirect(`/invoices/${invoice.id}`);
}

export async function submitInvoice(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.invoice.findFirstOrThrow({ where: { id, vendorId: user.vendorId } });
  await runSubmit(id);
  revalidatePath(`/invoices/${id}`); revalidatePath("/invoices"); revalidatePath("/dashboard");
}

const statusSchema = z.object({ id: z.string(), status: z.enum(["DRAFT", "READY", "SUBMITTED", "APPROVED", "REJECTED", "PAID", "VOID"]), note: opt(500) });

export async function setInvoiceStatus(formData: FormData) {
  const user = await requireUser();
  const d = statusSchema.parse(Object.fromEntries(formData));
  const inv = await prisma.invoice.findFirstOrThrow({ where: { id: d.id, vendorId: user.vendorId }, include: { customer: true } });
  await prisma.invoice.update({ where: { id: d.id }, data: { status: d.status, ...(d.note ? { notes: [inv.notes, `${new Date().toISOString().slice(0, 10)}: ${d.note}`].filter(Boolean).join("\n") } : {}) } });
  await prisma.activity.create({ data: { vendorId: user.vendorId, kind: d.status === "REJECTED" ? "WARNING" : d.status === "PAID" ? "SUCCESS" : "INFO", message: `Invoice ${inv.invoiceNumber} (${inv.customer.name}) marked ${d.status.toLowerCase()}${d.note ? `: ${d.note}` : ""}`, href: `/invoices/${d.id}` } });
  revalidatePath(`/invoices/${d.id}`); revalidatePath("/invoices"); revalidatePath("/dashboard");
}

/** Marks the latest pending manual submission as sent, with the portal's confirmation number. */
export async function confirmSubmission(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("submissionId"));
  const externalRef = String(formData.get("externalRef") ?? "").trim() || null;
  const sub = await prisma.invoiceSubmission.findFirst({ where: { id, invoice: { vendorId: user.vendorId } } });
  if (!sub) return;
  await prisma.invoiceSubmission.update({ where: { id }, data: { status: "SENT", externalRef, responseAt: new Date() } });
  await prisma.invoice.update({ where: { id: sub.invoiceId }, data: { status: "SUBMITTED" } });
  revalidatePath(`/invoices/${sub.invoiceId}`); revalidatePath("/invoices"); revalidatePath("/dashboard");
}

export async function deleteInvoice(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.invoice.deleteMany({ where: { id, vendorId: user.vendorId, status: { in: ["DRAFT", "READY", "VOID"] } } });
  revalidatePath("/invoices");
  redirect("/invoices");
}
