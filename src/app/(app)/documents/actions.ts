"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DOCUMENT_TYPE_KEYS, documentTypeShort } from "@/lib/document-types";
import { parseCents } from "@/lib/format";
import { deleteStoredFile, saveFile } from "@/lib/storage";

const opt = (max = 200) => z.string().trim().max(max).optional().transform((v) => v || null);
const schema = z.object({
  documentType: z.enum(DOCUMENT_TYPE_KEYS as [string, ...string[]]),
  title: z.string().trim().min(1),
  issuedAt: opt(20), expiresAt: opt(20),
  coverage: opt(30), carrier: opt(), policyNumber: opt(100), notes: opt(1000),
});

export async function uploadDocument(formData: FormData) {
  const user = await requireUser();
  const d = schema.parse(Object.fromEntries(formData));
  const file = formData.get("file");
  const stored = file instanceof File && file.size > 0 ? await saveFile(user.vendorId, file) : null;
  const doc = await prisma.complianceDocument.create({
    data: {
      vendorId: user.vendorId,
      documentType: d.documentType,
      title: d.title,
      issuedAt: d.issuedAt ? new Date(d.issuedAt) : null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      coverageCents: d.coverage ? parseCents(d.coverage) : null,
      carrier: d.carrier, policyNumber: d.policyNumber, notes: d.notes,
      ...(stored ?? {}),
    },
  });
  await prisma.activity.create({ data: { vendorId: user.vendorId, kind: "SUCCESS", message: `Uploaded ${documentTypeShort(doc.documentType)}: ${doc.title}`, href: "/documents" } });
  revalidatePath("/documents"); revalidatePath("/dashboard"); revalidatePath("/customers");
}

export async function deleteDocument(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const doc = await prisma.complianceDocument.findFirst({ where: { id, vendorId: user.vendorId } });
  if (!doc) return;
  if (doc.storageKey) await deleteStoredFile(doc.storageKey);
  await prisma.complianceDocument.delete({ where: { id } });
  revalidatePath("/documents"); revalidatePath("/dashboard"); revalidatePath("/customers");
}
