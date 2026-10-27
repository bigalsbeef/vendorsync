import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { relative } from "@/lib/format";
import { CONNECTORS, MODE_LABEL, getConnector } from "@/connectors/registry";
import { Badge, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function PortalsPage() {
  const user = await requireUser();
  const accounts = await prisma.portalAccount.findMany({ where: { vendorId: user.vendorId }, include: { customers: true }, orderBy: { label: "asc" } });
  const unused = CONNECTORS.filter((c) => c.key !== "EMAIL" && c.key !== "OTHER" && !accounts.some((a) => a.provider === c.key));
  return (
    <>
      <PageHeader title="Portals" subtitle="Every outside system you have to keep up with, in one list." actions={<Link href="/portals/new" className="btn-primary">Add portal</Link>} />
      {accounts.length === 0 ? (
        <EmptyState title="No portals yet" body="Add Ops Technology, VendorCafe, NetVendor, Paymode, AppFolio and whatever else your customers make you use." action={<Link href="/portals/new" className="btn-primary">Add your first portal</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Portal</th><th>Integration</th><th>Customers</th><th>Status</th><th>Last check</th><th></th></tr></thead>
            <tbody>
              {accounts.map((a) => {
                const c = getConnector(a.provider);
                return (
                  <tr key={a.id}>
                    <td><Link href={`/portals/${a.id}`} className="font-medium text-indigo-600 hover:underline">{a.label}</Link><span className="block text-xs text-gray-500">{c.name} · {c.owner}</span></td>
                    <td><Badge tone={c.mode === "API" ? "green" : c.mode === "EMAIL" ? "blue" : "gray"}>{MODE_LABEL[c.mode]}</Badge></td>
                    <td className="text-gray-600">{a.customers.length ? a.customers.map((x) => x.name).join(", ") : <span className="text-gray-400">none linked</span>}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-gray-500">{a.lastSyncAt ? relative(a.lastSyncAt) : "never"}</td>
                    <td className="text-right">{(a.loginUrl || c.defaultLoginUrl) && <a href={a.loginUrl || c.defaultLoginUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Open ↗</a>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {unused.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-500">Other portals VendorSync knows</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unused.map((c) => (
              <li key={c.key} className="card p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{c.name}</p>
                  <Link href={`/portals/new?provider=${c.key}`} className="text-xs text-indigo-600 whitespace-nowrap">+ Add</Link>
                </div>
                <p className="mt-1 text-xs text-gray-500">{c.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
