import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CONNECTORS } from "@/connectors/registry";

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  const portals = CONNECTORS.filter((c) => c.key !== "OTHER" && c.key !== "EMAIL");
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">VendorSync</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Every property-management portal. One login.</h1>
      <p className="mt-4 max-w-2xl text-lg text-gray-600">
        Stop juggling Ops Technology, VendorCafe, NetVendor, Paymode, AppFolio and the rest. Keep your insurance certificates,
        W-9s, invoices and payments in one place, and let VendorSync tell you exactly what each customer still needs.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/register" className="btn-primary">Create your account</Link>
        <Link href="/login" className="btn-secondary">Sign in</Link>
      </div>
      <h2 className="mt-16 text-sm font-semibold uppercase tracking-wide text-gray-500">Portals we track</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {portals.map((p) => (
          <li key={p.key} className="card p-4">
            <p className="font-medium">{p.name} <span className="text-xs text-gray-400">· {p.owner}</span></p>
            <p className="mt-1 text-sm text-gray-500">{p.summary}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
