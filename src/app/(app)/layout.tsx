import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { Nav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-indigo-600">VendorSync</Link>
          <p className="mt-0.5 truncate text-xs text-gray-500" title={user.vendor.name}>{user.vendor.name}</p>
        </div>
        <Nav />
        <div className="mt-auto border-t border-gray-100 px-5 py-4 text-sm">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
          <form action={logout} className="mt-2">
            <button className="text-xs text-gray-500 hover:text-gray-800">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <Link href="/dashboard" className="font-bold text-indigo-600">VendorSync</Link>
          <Nav compact />
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
