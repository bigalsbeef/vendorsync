import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assessCustomer } from "@/lib/compliance";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_KEYS, documentTypeLabel } from "@/lib/document-types";
import { dateShort, money } from "@/lib/format";
import { getConnector } from "@/connectors/registry";
import { Badge, Card, EmptyState, Field, PageHeader, StatusBadge, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { addProperty, addRequirement, removeProperty, removeRequirement, setRequirementStatus } from "../actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [customer, docs] = await Promise.all([
    prisma.customer.findFirst({
      where: { id, vendorId: user.vendorId },
      include: { requirements: { orderBy: { documentType: "asc" } }, portalAccount: true, properties: { orderBy: { name: "asc" } }, invoices: { orderBy: { issueDate: "desc" }, take: 15 } },
    }),
    prisma.complianceDocument.findMany({ where: { vendorId: user.vendorId } }),
  ]);
  if (!customer) notFound();
  const c = customer;
  const assessment = assessCustomer(c, docs);
  const connector = c.portalAccount ? getConnector(c.portalAccount.provider) : null;
  const missingTypes = DOCUMENT_TYPE_KEYS.filter((k) => !c.requirements.some((r) => r.documentType === k));
  const openAr = c.invoices.filter((i) => !["PAID", "VOID", "DRAFT"].includes(i.status)).reduce((s, i) => s + i.amountCents, 0);

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={<>
          {connector ? <>Portal: <Link href={`/portals/${c.portalAccountId}`} className="text-indigo-600 hover:underline">{c.portalAccount!.label}</Link> ({connector.name})</> : `Invoices by ${c.invoiceMethod.toLowerCase()}`}
          {c.vendorNumber && <> · Vendor # {c.vendorNumber}</>} · Net {c.paymentTermsDays}
          {c.apEmail && <> · AP: {c.apEmail}</>}
        </>}
        actions={<>
          <Link href={`/invoices/new?customer=${c.id}`} className="btn-primary">New invoice</Link>
          <Link href={`/customers/${c.id}/edit`} className="btn-secondary">Edit</Link>
        </>}
      />

      <div className="mb-6 flex items-center gap-3">
        <StatusBadge status={assessment.level} />
        <span className="text-sm text-gray-600">{assessment.satisfied} of {assessment.total} requirements satisfied</span>
        {assessment.level === "BLOCKED" && <span className="text-sm text-red-600">· this customer may hold payments or POs until fixed</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Compliance requirements">
            {c.requirements.length === 0 ? <EmptyState title="No requirements recorded" body="Add what this customer asks for (COI, W-9, licenses) so VendorSync can track it." /> : (
              <table className="table">
                <thead><tr><th>Requirement</th><th>Our document</th><th>Customer status</th><th>Action</th><th></th></tr></thead>
                <tbody>
                  {assessment.assessments.map((a) => {
                    const r = a.requirement;
                    return (
                      <tr key={r.id}>
                        <td>
                          <p className="font-medium">{documentTypeLabel(r.documentType)}</p>
                          <p className="text-xs text-gray-500">
                            {r.minCoverageCents ? `Min ${money(r.minCoverageCents)}` : null}
                            {r.additionalInsured ? (r.minCoverageCents ? " · " : "") + "Additional insured" : null}
                            {r.notes ? ` · ${r.notes}` : null}
                          </p>
                        </td>
                        <td>
                          {a.document ? (
                            <>
                              <StatusBadge status={a.health} />
                              <p className="mt-1 text-xs text-gray-500">{a.document.expiresAt ? `Exp ${dateShort(a.document.expiresAt)}` : "No expiration"}{a.document.coverageCents ? ` · ${money(a.document.coverageCents)}` : ""}{!a.coverageOk && <span className="text-red-600"> · below minimum</span>}</p>
                            </>
                          ) : <Link href={`/documents?type=${r.documentType}`} className="text-xs text-indigo-600 hover:underline">Upload</Link>}
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                          <p className="mt-1 text-xs text-gray-500">{r.submittedAt ? `Sent ${dateShort(r.submittedAt)}` : ""}{r.rejectionReason ? ` · ${r.rejectionReason}` : ""}</p>
                        </td>
                        <td className="text-sm">
                          {a.action ? <span className={a.health === "MISSING" || a.health === "EXPIRED" || !a.coverageOk ? "text-red-700" : "text-amber-700"}>{a.action}</span> : <span className="text-emerald-700">✓ Satisfied</span>}
                        </td>
                        <td>
                          <div className="flex flex-col items-end gap-1">
                            <form action={setRequirementStatus} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={r.id} />
                              <select name="status" className="input py-1 text-xs" defaultValue={r.status}>
                                <option value="NOT_SUBMITTED">Not submitted</option>
                                <option value="SUBMITTED">Submitted</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                                <option value="EXPIRED">Expired</option>
                              </select>
                              <SubmitButton className="btn-secondary btn-sm">Set</SubmitButton>
                            </form>
                            <ConfirmForm action={removeRequirement} message="Remove this requirement?" inputs={{ id: r.id }} className="text-xs text-gray-400 hover:text-red-600">remove</ConfirmForm>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-indigo-600">Add or update a requirement</summary>
              <form action={addRequirement} className="mt-3 grid gap-3 sm:grid-cols-4 items-end">
                <input type="hidden" name="customerId" value={c.id} />
                <Field label="Document" className="sm:col-span-2">
                  <select name="documentType" className="input" defaultValue={missingTypes[0] ?? "OTHER"}>
                    {DOCUMENT_TYPE_KEYS.map((k) => <option key={k} value={k}>{DOCUMENT_TYPES[k].label}</option>)}
                  </select>
                </Field>
                <Field label="Min coverage ($)"><input name="minCoverage" className="input" placeholder="1,000,000" /></Field>
                <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="additionalInsured" /> Additional insured</label>
                <Field label="Notes" className="sm:col-span-3"><input name="notes" className="input" placeholder="Certificate holder wording, endorsements…" /></Field>
                <SubmitButton className="btn-secondary">Save requirement</SubmitButton>
              </form>
            </details>
          </Card>

          <Card title="Recent invoices" actions={<Link href={`/invoices?customer=${c.id}`} className="text-xs text-indigo-600">All invoices</Link>}>
            {c.invoices.length === 0 ? <EmptyState title="No invoices yet" action={<Link href={`/invoices/new?customer=${c.id}`} className="btn-primary btn-sm">Create invoice</Link>} /> : (
              <table className="table">
                <thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {c.invoices.map((i) => (
                    <tr key={i.id}>
                      <td><Link href={`/invoices/${i.id}`} className="font-medium text-indigo-600 hover:underline">{i.invoiceNumber}</Link></td>
                      <td>{dateShort(i.issueDate)}</td><td>{dateShort(i.dueDate)}</td>
                      <td className="text-right">{money(i.amountCents)}</td><td><StatusBadge status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-sm text-gray-500">Open receivable: <span className="font-medium text-gray-800">{money(openAr)}</span></p>
          </Card>
        </div>

        <div className="space-y-6">
          {connector && (
            <Card title="How to submit here">
              <p className="text-sm text-gray-600">{connector.integrationNotes}</p>
              {connector.manualSteps.updateCompliance && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase text-gray-500">Updating compliance docs</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{connector.manualSteps.updateCompliance.map((s, i) => <li key={i}>{s}</li>)}</ol>
                </>
              )}
              {(c.portalAccount?.loginUrl || connector.defaultLoginUrl) && (
                <a href={c.portalAccount?.loginUrl || connector.defaultLoginUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm mt-4">Open {connector.name} ↗</a>
              )}
            </Card>
          )}
          {!connector && c.invoiceMethod !== "EMAIL" && <Alert tone="yellow">No portal linked. Edit the customer to choose the portal they use, or set invoice method to Email.</Alert>}

          <Card title="Properties">
            {c.properties.length === 0 ? <p className="text-sm text-gray-500">No properties yet. Add the communities you service so invoices reference them.</p> : (
              <ul className="divide-y divide-gray-100">
                {c.properties.map((p) => (
                  <li key={p.id} className="flex items-start justify-between py-2 text-sm">
                    <div><p className="font-medium">{p.name}</p><p className="text-xs text-gray-500">{[p.address, p.city, p.state].filter(Boolean).join(", ")}{p.unitCount ? ` · ${p.unitCount} units` : ""}</p></div>
                    <ConfirmForm action={removeProperty} message={`Remove ${p.name}?`} inputs={{ id: p.id }} className="text-xs text-gray-400 hover:text-red-600">remove</ConfirmForm>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-indigo-600">Add property</summary>
              <form action={addProperty} className="mt-3 space-y-2">
                <input type="hidden" name="customerId" value={c.id} />
                <input name="name" className="input" placeholder="Property / community name" required />
                <input name="address" className="input" placeholder="Street address" />
                <div className="grid grid-cols-3 gap-2">
                  <input name="city" className="input" placeholder="City" /><input name="state" className="input" placeholder="ST" /><input name="zip" className="input" placeholder="ZIP" />
                </div>
                <input name="unitCount" type="number" className="input" placeholder="Units (optional)" />
                <SubmitButton className="btn-secondary btn-sm">Add</SubmitButton>
              </form>
            </details>
          </Card>

          {(c.contactName || c.contactEmail || c.contactPhone || c.notes) && (
            <Card title="Contact & notes">
              <div className="space-y-1 text-sm">
                {c.contactName && <p className="font-medium">{c.contactName}</p>}
                {c.contactEmail && <p><a href={`mailto:${c.contactEmail}`} className="text-indigo-600">{c.contactEmail}</a></p>}
                {c.contactPhone && <p>{c.contactPhone}</p>}
                {c.notes && <p className="mt-2 whitespace-pre-wrap text-gray-600">{c.notes}</p>}
              </div>
            </Card>
          )}
          <div className="text-xs text-gray-400"><Badge>{c.active ? "Active" : "Inactive"}</Badge> · added {dateShort(c.createdAt)}</div>
        </div>
      </div>
    </>
  );
}
