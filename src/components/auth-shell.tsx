import Link from "next/link";

export function AuthShell({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-indigo-600">VendorSync</Link>
          <p className="mt-1 text-sm text-gray-500">One login for every property-management portal.</p>
        </div>
        <div className="card p-6">
          <h1 className="mb-4 text-lg font-semibold">{title}</h1>
          {children}
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">{footer}</p>
      </div>
    </main>
  );
}
