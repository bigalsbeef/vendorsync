import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateShort, relative } from "@/lib/format";
import { MODE_LABEL, getConnector } from "@/connectors/registry";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { PortalForm } from "../portal-form";
import { deletePortalAccount, setPortalStatus, testPortalConnection, updatePortalAccount } from "../actions";

export default async function PortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const account = await prisma.portalAccount.findFirst({
    where: { id, vendorId: user.vendorId },
    include: { customers: { orderBy: { name: "asc" } }, syncJobs: { orderBy: { createdAt: "desc" }, take: 10 }, submissions: { orderBy: { submittedAt: "desc" }, take: 10, include: { invoice: true } } },
  });
  if (!account) notFound();
  const c = getConnector(account.provider);
  const url = account.loginUrl || c.defaultLoginUrl;
  return (
    <>
      <PageHeader
        title={account.label}
        subtitle={<>{c.name} · {c.owner} · <Badge tone={c.mode === "EMAIL" ? "blue" : "gray"}>{MODE_LABEL[c.mode]}</Badge></>}
        actions={<>
          {url && <a href={url} target="_blank" rel="noreferrer" className="btn-primary">Open portal ↗</a>}
          <form action={testPortalConnection}><input type="hidden" name="id" value={id} /><SubmitButton className="btn-secondary" pendingText="Checking…">Check connection</SubmitButton></form>
        </>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="About this portal">
            <p className="text-sm text-gray-700">{c.summary}</p>
            <p className="mt-3 text-sm text-gray-600"><span className="font-semibold">How VendorSync integrates: </span>{c.integrationNotes}</p>
            {c.manualSteps.submitInvoice && (<><p className="mt-4 text-xs font-semibold uppercase text-gray-500">Submitting an invoice</p><ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{c.manualSteps.submitInvoice.map((s, i) => <li key={i}>{s}</li>)}</ol></>)}
            {c.manualSteps.updateCompliance && (<><p className="mt-4 text-xs font-semibold uppercase text-gray-500">Updating compliance documents</p><ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{c.manualSteps.updateCompliance.map((s, i) => <li key={i}>{s}</li>)}</ol></>)}
            {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-indigo-600">{c.website}</a>}
          </Card>
          <Card title="Account details"><PortalForm account={account} action={updatePortalAccount} /></Card>
          <Card title="Recent submissions through this portal">
            {account.submissions.length === 0 ? <p className="text-sm text-gray-500">None yet.</p> : (
              <table className="table"><thead><tr><th>Invoice</th><th>When</th><th>Method</th><th>Status</th><th>Ref</th></tr></thead>
                <tbody>{account.submissions.map((s) => (
                  <tr key={s.id}><td><Link href={`/invoices/${s.invoiceId}`} className="text-indigo-600 hover:underline">{s.invoice.invoiceNumber}</Link></td><td>{dateShort(s.submittedAt)}</td><td>{s.method}</td><td><StatusBadge status={s.status} /></td><td className="text-gray-500">{s.externalRef ?? "—"}</td></tr>
                ))}</tbody></table>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Status">
            <div className="flex items-center justify-between"><StatusBadge status={account.status} /><span className="text-xs text-gray-500">{account.lastSyncAt ? `checked ${relative(account.lastSyncAt)}` : "never checked"}</span></div>
            {account.lastSyncResult && <p className="mt-2 text-sm text-gray-600">{account.lastSyncResult}</p>}
            <form action={setPortalStatus} className="mt-4 flex gap-2">
              <input type="hidden" name="id" value={id} />
              <select name="status" className="input" defaultValue={account.status}><option value="CONNECTED">Connected</option><option value="NEEDS_ATTENTION">Needs attention</option><option value="DISCONNECTED">Disconnected</option></select>
              <SubmitButton className="btn-secondary">Set</SubmitButton>
            </form>
            <p className="mt-2 text-xs text-gray-400">Set “Needs attention” when a portal is asking for renewals, fees, or a password reset.</p>
          </Card>
          <Card title="Customers on this portal">
            {account.customers.length === 0 ? <p className="text-sm text-gray-500">No customers linked. <Link href="/customers/new" className="text-indigo-600">Add one</Link>.</p> : (
              <ul className="space-y-1 text-sm">{account.customers.map((x) => <li key={x.id}><Link href={`/customers/${x.id}`} className="text-indigo-600 hover:underline">{x.name}</Link></li>)}</ul>
            )}
          </Card>
          <Card title="Connection log">
            {account.syncJobs.length === 0 ? <p className="text-sm text-gray-500">No checks yet.</p> : (
              <ul className="space-y-2 text-xs">{account.syncJobs.map((j) => (
                <li key={j.id}><StatusBadge status={j.status} /> <span className="text-gray-500">{j.kind.replace("_", " ").toLowerCase()} · {relative(j.createdAt)}</span>{j.log && <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-[11px] text-gray-600">{j.log}</pre>}</li>
              ))}</ul>
            )}
          </Card>
          <ConfirmForm action={deletePortalAccount} message={`Remove ${account.label}? Customers linked to it will be unlinked.`} inputs={{ id }}>Remove portal</ConfirmForm>
        </div>
      </div>
    </>
  );
}
