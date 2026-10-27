import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateShort, money } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

const FILTERS: { key: string; label: string; statuses?: string[] }[] = [
  { key: "open", label: "Open", statuses: ["DRAFT", "READY", "SUBMITTED", "APPROVED", "REJECTED"] },
  { key: "unsent", label: "Not submitted", statuses: ["DRAFT", "READY"] },
  { key: "submitted", label: "Awaiting payment", statuses: ["SUBMITTED", "APPROVED"] },
  { key: "rejected", label: "Rejected", statuses: ["REJECTED"] },
  { key: "paid", label: "Paid", statuses: ["PAID"] },
  { key: "all", label: "All" },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; customer?: string }> }) {
  const user = await requireUser();
  const { status = "open", customer } = await searchParams;
  const filter = FILTERS.find((f) => f.key === status) ?? FILTERS[0];
  const invoices = await prisma.invoice.findMany({
    where: { vendorId: user.vendorId, ...(filter.statuses ? { status: { in: filter.statuses } } : {}), ...(customer ? { customerId: customer } : {}) },
    include: { customer: { include: { portalAccount: true } }, property: true },
    orderBy: [{ dueDate: "asc" }],
    take: 300,
  });
  const total = invoices.reduce((s, i) => s + i.amountCents, 0);
  const today = new Date();
  return (
    <>
      <PageHeader title="Invoices" subtitle={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"} · ${money(total)}`}
        actions={<>
          <a href={`/invoices/export?status=${status}${customer ? `&customer=${customer}` : ""}`} className="btn-secondary">Export CSV</a>
          <Link href="/invoices/new" className="btn-primary">New invoice</Link>
        </>} />
      <div className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/invoices?status=${f.key}${customer ? `&customer=${customer}` : ""}`} className={`rounded-full px-3 py-1 text-sm ${f.key === filter.key ? "bg-indigo-600 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"}`}>{f.label}</Link>
        ))}
        {customer && <Link href={`/invoices?status=${status}`} className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800 ring-1 ring-amber-200">Customer filter × </Link>}
      </div>
      {invoices.length === 0 ? <EmptyState title="No invoices match" action={<Link href="/invoices/new" className="btn-primary btn-sm">Create invoice</Link>} /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Property / PO</th><th>Issued</th><th>Due</th><th className="text-right">Amount</th><th>Submit via</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td><Link href={`/invoices/${i.id}`} className="font-medium text-indigo-600 hover:underline">{i.invoiceNumber}</Link></td>
                  <td>{i.customer.name}</td>
                  <td className="text-gray-600">{i.property?.name ?? "—"}{i.poNumber && <span className="block text-xs text-gray-400">PO {i.poNumber}</span>}</td>
                  <td>{dateShort(i.issueDate)}</td>
                  <td className={i.dueDate < today && !["PAID", "VOID"].includes(i.status) ? "text-red-600 font-medium" : ""}>{dateShort(i.dueDate)}</td>
                  <td className="text-right">{money(i.amountCents)}</td>
                  <td className="text-gray-600">{i.customer.portalAccount?.label ?? (i.customer.invoiceMethod === "EMAIL" ? "Email" : i.customer.invoiceMethod.toLowerCase())}</td>
                  <td><StatusBadge status={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
