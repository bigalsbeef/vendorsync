import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assessCustomer } from "@/lib/compliance";
import { money } from "@/lib/format";
import { getConnector } from "@/connectors/registry";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function CustomersPage() {
  const user = await requireUser();
  const [customers, docs] = await Promise.all([
    prisma.customer.findMany({
      where: { vendorId: user.vendorId },
      include: { requirements: true, portalAccount: true, invoices: { where: { status: { notIn: ["PAID", "VOID"] } } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.complianceDocument.findMany({ where: { vendorId: user.vendorId } }),
  ]);
  return (
    <>
      <PageHeader title="Customers" subtitle="Property management companies you work for, and where each one stands." actions={<Link href="/customers/new" className="btn-primary">Add customer</Link>} />
      {customers.length === 0 ? (
        <EmptyState title="No customers yet" body="Add each management company, the portal they use, and what they require from you." action={<Link href="/customers/new" className="btn-primary">Add your first customer</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Customer</th><th>Portal</th><th>Compliance</th><th>Requirements</th><th className="text-right">Open A/R</th><th>Terms</th></tr></thead>
            <tbody>
              {customers.map((c) => {
                const a = assessCustomer(c, docs);
                const open = c.invoices.reduce((s, i) => s + i.amountCents, 0);
                return (
                  <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                    <td><Link href={`/customers/${c.id}`} className="font-medium text-indigo-600 hover:underline">{c.name}</Link>{!c.active && <span className="ml-2 text-xs text-gray-400">inactive</span>}</td>
                    <td className="text-gray-600">{c.portalAccount ? c.portalAccount.label : c.invoiceMethod === "EMAIL" ? "Email" : "—"}{c.portalAccount && <span className="block text-xs text-gray-400">{getConnector(c.portalAccount.provider).name}</span>}</td>
                    <td><StatusBadge status={a.level} /></td>
                    <td className="text-gray-600">{a.satisfied} / {a.total} satisfied</td>
                    <td className="text-right">{money(open)}</td>
                    <td className="text-gray-500">Net {c.paymentTermsDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
