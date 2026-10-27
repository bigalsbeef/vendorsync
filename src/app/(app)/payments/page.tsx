import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateShort, money, toDateInput } from "@/lib/format";
import { Card, EmptyState, Field, PageHeader, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { deletePayment, recordPayment } from "./actions";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const user = await requireUser();
  const { invoice: preselect } = await searchParams;
  const [payments, customers, openInvoices] = await Promise.all([
    prisma.payment.findMany({ where: { vendorId: user.vendorId }, include: { customer: true, invoice: true }, orderBy: { paidAt: "desc" }, take: 200 }),
    prisma.customer.findMany({ where: { vendorId: user.vendorId, active: true }, orderBy: { name: "asc" } }),
    prisma.invoice.findMany({ where: { vendorId: user.vendorId, status: { in: ["SUBMITTED", "APPROVED", "READY"] } }, include: { customer: true }, orderBy: { dueDate: "asc" } }),
  ]);
  const pre = openInvoices.find((i) => i.id === preselect);
  const thisMonth = payments.filter((p) => p.paidAt.getMonth() === new Date().getMonth() && p.paidAt.getFullYear() === new Date().getFullYear());

  return (
    <>
      <PageHeader title="Payments" subtitle={`${money(thisMonth.reduce((s, p) => s + p.amountCents, 0))} received this month.`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Payment history">
            {payments.length === 0 ? <EmptyState title="No payments recorded" body="Record payments as remittances arrive (Paymode, Yardi Bill Pay, checks) to close out invoices." /> : (
              <table className="table">
                <thead><tr><th>Date</th><th>Customer</th><th>Invoice</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th><th></th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{dateShort(p.paidAt)}</td>
                      <td>{p.customer.name}</td>
                      <td>{p.invoice ? <Link href={`/invoices/${p.invoice.id}`} className="text-indigo-600 hover:underline">{p.invoice.invoiceNumber}</Link> : <span className="text-gray-400">—</span>}</td>
                      <td><Badge>{p.method.replace("_", "-")}</Badge></td>
                      <td className="text-gray-500">{p.reference ?? "—"}</td>
                      <td className="text-right font-medium">{money(p.amountCents)}</td>
                      <td className="text-right"><ConfirmForm action={deletePayment} message="Delete this payment record?" inputs={{ id: p.id }} className="text-xs text-gray-400 hover:text-red-600">Delete</ConfirmForm></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
        <Card title="Record a payment">
          <form action={recordPayment} className="space-y-3">
            <Field label="Customer">
              <select name="customerId" className="input" required defaultValue={pre?.customerId ?? ""}>
                <option value="" disabled>Select…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Applies to invoice (optional)">
              <select name="invoiceId" className="input" defaultValue={pre?.id ?? ""}>
                <option value="">— none / on account —</option>
                {openInvoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.customer.name} · {money(i.amountCents)}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount"><input name="amount" className="input" required inputMode="decimal" defaultValue={pre ? (pre.amountCents / 100).toFixed(2) : ""} placeholder="0.00" /></Field>
              <Field label="Date received"><input name="paidAt" type="date" className="input" required defaultValue={toDateInput(new Date())} /></Field>
            </div>
            <Field label="Method">
              <select name="method" className="input" defaultValue="ACH">
                <option value="ACH">ACH</option><option value="PAYMODE_X">Paymode</option><option value="CHECK">Check</option><option value="CARD">Virtual card</option><option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Reference / check #"><input name="reference" className="input" /></Field>
            <Field label="Notes"><input name="notes" className="input" /></Field>
            <SubmitButton>Record payment</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
