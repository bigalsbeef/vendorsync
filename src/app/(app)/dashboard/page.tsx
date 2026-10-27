import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assessCustomer } from "@/lib/compliance";
import { dateShort, daysUntil, money, relative } from "@/lib/format";
import { documentTypeShort } from "@/lib/document-types";
import { Badge, Card, EmptyState, PageHeader, Stat, StatusBadge } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  const vendorId = user.vendorId;
  const [customers, docs, invoices, portals, activities] = await Promise.all([
    prisma.customer.findMany({ where: { vendorId, active: true }, include: { requirements: true, portalAccount: true }, orderBy: { name: "asc" } }),
    prisma.complianceDocument.findMany({ where: { vendorId } }),
    prisma.invoice.findMany({ where: { vendorId, status: { notIn: ["PAID", "VOID"] } }, include: { customer: true }, orderBy: { dueDate: "asc" } }),
    prisma.portalAccount.findMany({ where: { vendorId }, orderBy: { label: "asc" } }),
    prisma.activity.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const compliance = customers.map((c) => assessCustomer(c, docs));
  const blocked = compliance.filter((c) => c.level === "BLOCKED");
  const atRisk = compliance.filter((c) => c.level === "AT_RISK");
  const actions = compliance.flatMap((c) => c.assessments.filter((a) => a.action).map((a) => ({ customer: c.customer, ...a })));

  const expiring = docs
    .filter((d) => d.expiresAt && (daysUntil(d.expiresAt) ?? 999) <= 60)
    .sort((a, b) => a.expiresAt!.getTime() - b.expiresAt!.getTime());

  const outstanding = invoices.reduce((s, i) => s + i.amountCents, 0);
  const overdue = invoices.filter((i) => i.dueDate < new Date() && ["SUBMITTED", "APPROVED"].includes(i.status));
  const unsent = invoices.filter((i) => ["DRAFT", "READY"].includes(i.status));
  const needsAttention = portals.filter((p) => p.status !== "CONNECTED");

  return (
    <>
      <PageHeader title={`Good ${greeting()}, ${user.name.split(" ")[0]}`} subtitle="Here is where you stand across every customer and portal." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Customers compliant" value={`${compliance.length - blocked.length - atRisk.length} / ${compliance.length}`}
          sub={blocked.length ? `${blocked.length} blocked, ${atRisk.length} at risk` : atRisk.length ? `${atRisk.length} at risk` : "All clear"} tone={blocked.length ? "red" : atRisk.length ? "yellow" : "green"} href="/customers" />
        <Stat label="Docs expiring ≤ 60 days" value={expiring.length} sub={expiring[0] ? `${(daysUntil(expiring[0].expiresAt) ?? 0) < 0 ? "Expired" : "Next"}: ${documentTypeShort(expiring[0].documentType)} ${dateShort(expiring[0].expiresAt)}` : "Nothing expiring soon"} tone={expiring.some((d) => (daysUntil(d.expiresAt) ?? 0) < 0) ? "red" : expiring.length ? "yellow" : "green"} href="/documents" />
        <Stat label="Open receivables" value={money(outstanding)} sub={overdue.length ? `${overdue.length} overdue · ${money(overdue.reduce((s, i) => s + i.amountCents, 0))}` : `${invoices.length} open invoices`} tone={overdue.length ? "red" : "gray"} href="/invoices" />
        <Stat label="Invoices not yet submitted" value={unsent.length} sub={unsent.length ? money(unsent.reduce((s, i) => s + i.amountCents, 0)) + " waiting" : "Everything is submitted"} tone={unsent.length ? "yellow" : "green"} href="/invoices?status=unsent" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title={`Action items (${actions.length})`}>
            {actions.length === 0 ? (
              <EmptyState title="No compliance actions right now" body={customers.length ? "Every customer requirement is satisfied." : "Add a customer and its requirements to start tracking."} action={!customers.length && <Link href="/customers/new" className="btn-primary btn-sm">Add customer</Link>} />
            ) : (
              <ul className="divide-y divide-gray-100">
                {actions.slice(0, 12).map((a) => (
                  <li key={a.requirement.id} className="flex items-start justify-between gap-4 py-2.5">
                    <div>
                      <Link href={`/customers/${a.customer.id}`} className="font-medium hover:underline">{a.customer.name}</Link>
                      <span className="text-gray-400"> · </span>
                      <span className="text-sm">{documentTypeShort(a.requirement.documentType)}</span>
                      <p className="text-sm text-gray-600">{a.action}</p>
                    </div>
                    <StatusBadge status={a.health === "VALID" ? a.customerStatus : a.health} />
                  </li>
                ))}
                {actions.length > 12 && <li className="pt-3 text-sm text-gray-500">+ {actions.length - 12} more on the <Link href="/customers" className="text-indigo-600">customers</Link> page</li>}
              </ul>
            )}
          </Card>

          <Card title="Invoices needing attention" actions={<Link href="/invoices/new" className="btn-secondary btn-sm">New invoice</Link>}>
            {unsent.length + overdue.length === 0 ? (
              <EmptyState title="Nothing waiting" body="All invoices are submitted and none are overdue." />
            ) : (
              <table className="table">
                <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {[...unsent, ...overdue].slice(0, 10).map((i) => (
                    <tr key={i.id}>
                      <td><Link href={`/invoices/${i.id}`} className="font-medium text-indigo-600 hover:underline">{i.invoiceNumber}</Link></td>
                      <td>{i.customer.name}</td>
                      <td className={i.dueDate < new Date() ? "text-red-600" : ""}>{dateShort(i.dueDate)}</td>
                      <td className="text-right">{money(i.amountCents)}</td>
                      <td><StatusBadge status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Portals" actions={<Link href="/portals" className="text-xs text-indigo-600">Manage</Link>}>
            {portals.length === 0 ? (
              <EmptyState title="No portals yet" action={<Link href="/portals/new" className="btn-primary btn-sm">Add portal</Link>} />
            ) : (
              <ul className="space-y-2">
                {portals.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/portals/${p.id}`} className="truncate hover:underline">{p.label}</Link>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
                {needsAttention.length > 0 && <li className="pt-1 text-xs text-amber-700">{needsAttention.length} portal{needsAttention.length > 1 ? "s" : ""} need attention</li>}
              </ul>
            )}
          </Card>

          <Card title="Expiring documents">
            {expiring.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing expires in the next 60 days.</p>
            ) : (
              <ul className="space-y-2">
                {expiring.slice(0, 6).map((d) => {
                  const days = daysUntil(d.expiresAt)!;
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{documentTypeShort(d.documentType)} <span className="text-gray-400">· {d.title}</span></span>
                      <Badge tone={days < 0 ? "red" : days <= 30 ? "yellow" : "gray"}>{days < 0 ? `${-days}d ago` : `${days}d`}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Recent activity">
            {activities.length === 0 ? <p className="text-sm text-gray-500">No activity yet.</p> : (
              <ul className="space-y-2.5">
                {activities.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${a.kind === "ERROR" ? "bg-red-500" : a.kind === "WARNING" ? "bg-amber-500" : a.kind === "SUCCESS" ? "bg-emerald-500" : "bg-gray-400"}`} />
                    {a.href ? <Link href={a.href} className="hover:underline">{a.message}</Link> : a.message}
                    <span className="block pl-3.5 text-xs text-gray-400">{relative(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}
