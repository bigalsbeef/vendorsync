"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";

const str = (max = 200) => z.string().trim().max(max).optional().transform((v) => v || null);

const profileSchema = z.object({
  name: z.string().trim().min(1),
  legalName: str(), ein: str(20), phone: str(40), email: str(), website: str(),
  address: str(), city: str(100), state: str(20), zip: str(20), remitTo: str(1000),
});

export async function updateVendorProfile(formData: FormData) {
  const user = await requireUser();
  const data = profileSchema.parse(Object.fromEntries(formData));
  await prisma.vendor.update({ where: { id: user.vendorId }, data });
  revalidatePath("/settings");
}

const userSchema = z.object({ name: z.string().trim().min(1), email: z.string().email(), password: z.string().min(8), role: z.enum(["ADMIN", "STAFF"]) });

export async function addTeamMember(formData: FormData) {
  const user = await requireUser();
  if (user.role === "STAFF") throw new Error("Only owners and admins can add users.");
  const data = userSchema.parse(Object.fromEntries(formData));
  await prisma.user.create({
    data: { vendorId: user.vendorId, name: data.name, email: data.email.toLowerCase(), role: data.role, passwordHash: await hashPassword(data.password) },
  });
  revalidatePath("/settings");
}

export async function removeTeamMember(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  if (user.role === "STAFF" || id === user.id) throw new Error("Not allowed.");
  await prisma.user.deleteMany({ where: { id, vendorId: user.vendorId, role: { not: "OWNER" } } });
  revalidatePath("/settings");
}
