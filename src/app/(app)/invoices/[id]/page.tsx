import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assessCustomer } from "@/lib/compliance";
import { dateShort, money, relative } from "@/lib/format";
import { getConnector } from "@/connectors/registry";
import { emailConnector } from "@/connectors/providers/email";
import { Alert, Card, Field, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { confirmSubmission, deleteInvoice, setInvoiceStatus, submitInvoice } from "../actions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const invoice = await prisma.invoice.findFirst({
    where: { id, vendorId: user.vendorId },
    include: {
      customer: { include: { portalAccount: true, requirements: true } },
      property: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      submissions: { orderBy: { submittedAt: "desc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) notFound();
  const docs = await prisma.complianceDocument.findMany({ where: { vendorId: user.vendorId } });
  const inv = invoice;
  const c = inv.customer;
  const compliance = assessCustomer(c, docs);
  const viaEmail = c.invoiceMethod === "EMAIL" || !c.portalAccount || Boolean(c.portalAccount.intakeEmail);
  const connector = viaEmail ? emailConnector : getConnector(c.portalAccount!.provider);
  const routeLabel = viaEmail ? `Email → ${c.portalAccount?.intakeEmail || c.apEmail || "(no address set)"}` : `${c.portalAccount!.label} (${connector.name})`;
  const pendingManual = inv.submissions.find((s) => s.status === "PENDING");
  const paid = inv.payments.reduce((s, p) => s + p.amountCents, 0);
  const canSubmit = !["PAID", "VOID"].includes(inv.status);
  const portalUrl = c.portalAccount?.loginUrl || (c.portalAccount ? getConnector(c.portalAccount.provider).defaultLoginUrl : "");

  return (
    <>
      <PageHeader
        title={`Invoice ${inv.invoiceNumber}`}
        subtitle={<><Link href={`/customers/${c.id}`} className="text-indigo-600 hover:underline">{c.name}</Link>{inv.property && <> · {inv.property.name}</>} · issued {dateShort(inv.issueDate)} · due {dateShort(inv.dueDate)}</>}
        actions={<>
          <a href={`/invoices/${inv.id}/pdf`} target="_blank" className="btn-secondary">View PDF ↗</a>
          {canSubmit && (
            <form action={submitInvoice}><input type="hidden" name="id" value={inv.id} /><SubmitButton pendingText="Submitting…">{inv.status === "SUBMITTED" ? "Resubmit" : "Submit invoice"}</SubmitButton></form>
          )}
        </>}
      />

      {compliance.level === "BLOCKED" && (
        <div className="mb-4"><Alert tone="red">Compliance is blocked for {c.name} ({compliance.assessments.filter((a) => a.action).map((a) => a.action).slice(0, 2).join("; ")}). Many portals hold payment until this is fixed. <Link href={`/customers/${c.id}`} className="underline">Review requirements</Link>.</Alert></div>
      )}
      {pendingManual && (
        <div className="mb-4">
          <Alert tone="yellow">
            <p className="font-medium">Finish this submission in {connector.name}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">{(connector.manualSteps.submitInvoice ?? []).map((s, i) => <li key={i}>{s}</li>)}</ol>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              {portalUrl && <a href={portalUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Open portal ↗</a>}
              <a href={`/invoices/${inv.id}/pdf`} target="_blank" className="btn-secondary btn-sm">Download PDF</a>
              <form action={confirmSubmission} className="flex items-end gap-2">
                <input type="hidden" name="submissionId" value={pendingManual.id} />
                <Field label="Portal confirmation #"><input name="externalRef" className="input py-1" placeholder="optional" /></Field>
                <SubmitButton className="btn-primary btn-sm">Mark as submitted</SubmitButton>
              </form>
            </div>
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Invoice">
            <table className="table">
              <thead><tr><th>Description</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {(inv.lineItems.length ? inv.lineItems : [{ id: "x", description: inv.description ?? "Services", quantity: 1, unitPriceCents: inv.amountCents, totalCents: inv.amountCents }]).map((l) => (
                  <tr key={l.id}><td>{l.description}</td><td className="text-right">{l.quantity}</td><td className="text-right">{money(l.unitPriceCents)}</td><td className="text-right">{money(l.totalCents)}</td></tr>
                ))}
                <tr><td colSpan={3} className="text-right font-semibold">Total</td><td className="text-right text-lg font-semibold">{money(inv.amountCents)}</td></tr>
              </tbody>
            </table>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              {inv.poNumber && <div><dt className="text-xs text-gray-500">PO #</dt><dd>{inv.poNumber}</dd></div>}
              {inv.workOrderNumber && <div><dt className="text-xs text-gray-500">Work order #</dt><dd>{inv.workOrderNumber}</dd></div>}
              {c.vendorNumber && <div><dt className="text-xs text-gray-500">Vendor #</dt><dd>{c.vendorNumber}</dd></div>}
              {inv.fileName && <div><dt className="text-xs text-gray-500">Attached PDF</dt><dd>{inv.fileName}</dd></div>}
              {inv.description && inv.lineItems.length > 0 && <div className="sm:col-span-3"><dt className="text-xs text-gray-500">Memo</dt><dd>{inv.description}</dd></div>}
            </dl>
            {inv.notes && <p className="mt-4 whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-600">{inv.notes}</p>}
          </Card>

          <Card title="Submission history">
            {inv.submissions.length === 0 ? <p className="text-sm text-gray-500">Not submitted yet. Route: <span className="font-medium text-gray-700">{routeLabel}</span>.</p> : (
              <ul className="divide-y divide-gray-100">
                {inv.submissions.map((s) => (
                  <li key={s.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between"><span><StatusBadge status={s.status} /> <span className="ml-2 text-gray-500">{s.method.toLowerCase()} · {relative(s.submittedAt)}</span></span>{s.externalRef && <span className="text-xs text-gray-500">ref {s.externalRef}</span>}</div>
                    {s.message && <pre className="mt-1 whitespace-pre-wrap text-xs text-gray-600">{s.message.split("\n")[0]}</pre>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <div className="flex items-center justify-between"><StatusBadge status={inv.status} />{paid > 0 && <span className="text-xs text-gray-500">{money(paid)} paid</span>}</div>
            <form action={setInvoiceStatus} className="mt-4 space-y-2">
              <input type="hidden" name="id" value={inv.id} />
              <select name="status" className="input" defaultValue={inv.status}>
                {["DRAFT", "READY", "SUBMITTED", "APPROVED", "REJECTED", "PAID", "VOID"].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
              <input name="note" className="input" placeholder="Note (e.g. rejection reason)" />
              <SubmitButton className="btn-secondary w-full">Update status</SubmitButton>
            </form>
            {inv.status !== "PAID" && <Link href={`/payments?invoice=${inv.id}`} className="btn-primary btn-sm mt-3 w-full">Record payment</Link>}
          </Card>
          <Card title="Route">
            <p className="text-sm font-medium">{routeLabel}</p>
            <p className="mt-2 text-xs text-gray-500">{connector.integrationNotes}</p>
          </Card>
          {inv.payments.length > 0 && (
            <Card title="Payments">
              <ul className="space-y-1 text-sm">{inv.payments.map((p) => <li key={p.id} className="flex justify-between"><span>{dateShort(p.paidAt)} · {p.method}</span><span>{money(p.amountCents)}</span></li>)}</ul>
            </Card>
          )}
          {["DRAFT", "READY", "VOID"].includes(inv.status) && (
            <ConfirmForm action={deleteInvoice} message={`Delete invoice ${inv.invoiceNumber}?`} inputs={{ id: inv.id }}>Delete invoice</ConfirmForm>
          )}
        </div>
      </div>
    </>
  );
}
