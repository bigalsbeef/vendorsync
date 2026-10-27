"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

const registerSchema = z.object({
  company: z.string().min(2, "Company name is required"),
  name: z.string().min(1, "Your name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function register(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return { error: "An account with that email already exists." };
  const vendor = await prisma.vendor.create({
    data: {
      name: parsed.data.company,
      email,
      users: { create: { email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), role: "OWNER" } },
      activities: { create: { kind: "INFO", message: "Welcome to VendorSync. Start by adding the portals and customers you work with." } },
    },
    include: { users: true },
  });
  await createSession(vendor.users[0].id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
