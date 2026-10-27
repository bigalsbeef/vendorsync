import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell title="Sign in to VendorSync" footer={<>New here? <Link href="/register" className="text-indigo-600 hover:underline">Create your vendor account</Link></>}>
      <LoginForm />
    </AuthShell>
  );
}
