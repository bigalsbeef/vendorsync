import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "./form";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell title="Create your vendor account" footer={<>Already have an account? <Link href="/login" className="text-indigo-600 hover:underline">Sign in</Link></>}>
      <RegisterForm />
    </AuthShell>
  );
}
