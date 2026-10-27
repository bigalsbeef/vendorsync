"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { CONNECTORS, getConnector } from "@/connectors/registry";
import { runPortalJob } from "@/connectors/run";

const opt = (max = 300) => z.string().trim().max(max).optional().transform((v) => v || null);

const schema = z.object({
  provider: z.enum(CONNECTORS.map((c) => c.key) as [string, ...string[]]),
  label: z.string().trim().min(1),
  loginUrl: opt(500),
  username: opt(),
  password: z.string().optional(),
  intakeEmail: opt(),
  notes: opt(2000),
});

export async function createPortalAccount(formData: FormData) {
  const user = await requireUser();
  const d = schema.parse(Object.fromEntries(formData));
  const connector = getConnector(d.provider);
  const account = await prisma.portalAccount.create({
    data: {
      vendorId: user.vendorId,
      provider: d.provider,
      label: d.label,
      loginUrl: d.loginUrl ?? connector.defaultLoginUrl ?? null,
      username: d.username,
      encryptedSecret: d.password ? encryptSecret(d.password) : null,
      intakeEmail: d.intakeEmail,
      notes: d.notes,
    },
  });
  await prisma.activity.create({ data: { vendorId: user.vendorId, kind: "INFO", message: `Added portal ${account.label} (${connector.name})`, href: `/portals/${account.id}` } });
  revalidatePath("/portals");
  redirect(`/portals/${account.id}`);
}

export async function updatePortalAccount(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.portalAccount.findFirstOrThrow({ where: { id, vendorId: user.vendorId } });
  const d = schema.parse(Object.fromEntries(formData));
  await prisma.portalAccount.update({
    where: { id },
    data: {
      provider: d.provider, label: d.label, loginUrl: d.loginUrl, username: d.username, intakeEmail: d.intakeEmail, notes: d.notes,
      ...(d.password ? { encryptedSecret: encryptSecret(d.password) } : {}),
      ...(formData.get("clearPassword") === "on" ? { encryptedSecret: null } : {}),
    },
  });
  revalidatePath(`/portals/${id}`); revalidatePath("/portals");
}

export async function deletePortalAccount(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.portalAccount.deleteMany({ where: { id, vendorId: user.vendorId } });
  revalidatePath("/portals");
  redirect("/portals");
}

export async function testPortalConnection(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.portalAccount.findFirstOrThrow({ where: { id, vendorId: user.vendorId } });
  await runPortalJob(id, "TEST_CONNECTION");
  revalidatePath(`/portals/${id}`); revalidatePath("/portals"); revalidatePath("/dashboard");
}

export async function setPortalStatus(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const status = z.enum(["CONNECTED", "NEEDS_ATTENTION", "DISCONNECTED"]).parse(formData.get("status"));
  await prisma.portalAccount.updateMany({ where: { id, vendorId: user.vendorId }, data: { status } });
  revalidatePath(`/portals/${id}`); revalidatePath("/portals");
}
