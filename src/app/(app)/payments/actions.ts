"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseCents } from "@/lib/format";

const schema = z.object({
  customerId: z.string().min(1),
  invoiceId: z.string().optional().transform((v) => v || null),
  amount: z.string().min(1),
  paidAt: z.string().min(1),
  method: z.enum(["ACH", "CHECK", "CARD", "PAYMODE_X", "OTHER"]),
  reference: z.string().trim().max(100).optional().transform((v) => v || null),
  notes: z.string().trim().max(1000).optional().transform((v) => v || null),
});

export async function recordPayment(formData: FormData) {
  const user = await requireUser();
  const d = schema.parse(Object.fromEntries(formData));
  const customer = await prisma.customer.findFirstOrThrow({ where: { id: d.customerId, vendorId: user.vendorId } });
  const amountCents = parseCents(d.amount);
  await prisma.payment.create({
    data: { vendorId: user.vendorId, customerId: customer.id, invoiceId: d.invoiceId, amountCents, paidAt: new Date(d.paidAt), method: d.method, reference: d.reference, notes: d.notes },
  });
  if (d.invoiceId) {
    const inv = await prisma.invoice.findFirst({ where: { id: d.invoiceId, vendorId: user.vendorId }, include: { payments: true } });
    if (inv) {
      const paid = inv.payments.reduce((s, p) => s + p.amountCents, 0);
      if (paid >= inv.amountCents) await prisma.invoice.update({ where: { id: inv.id }, data: { status: "PAID" } });
    }
  }
  await prisma.activity.create({ data: { vendorId: user.vendorId, kind: "SUCCESS", message: `Payment of ${(amountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} recorded from ${customer.name}`, href: "/payments" } });
  revalidatePath("/payments"); revalidatePath("/invoices"); revalidatePath("/dashboard");
}

export async function deletePayment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const p = await prisma.payment.findFirst({ where: { id, vendorId: user.vendorId } });
  if (!p) return;
  await prisma.payment.delete({ where: { id } });
  if (p.invoiceId) await prisma.invoice.updateMany({ where: { id: p.invoiceId, status: "PAID" }, data: { status: "APPROVED" } });
  revalidatePath("/payments"); revalidatePath("/invoices");
}
