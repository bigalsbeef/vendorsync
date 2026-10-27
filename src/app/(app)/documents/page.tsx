import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { documentHealth } from "@/lib/compliance";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_KEYS, documentTypeLabel } from "@/lib/document-types";
import { dateShort, daysUntil, money, relative } from "@/lib/format";
import { Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { deleteDocument, uploadDocument } from "./actions";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser();
  const { type } = await searchParams;
  const [docs, requirements] = await Promise.all([
    prisma.complianceDocument.findMany({ where: { vendorId: user.vendorId }, orderBy: [{ documentType: "asc" }, { expiresAt: "desc" }] }),
    prisma.complianceRequirement.findMany({ where: { customer: { vendorId: user.vendorId, active: true } }, include: { customer: true } }),
  ]);
  const requiredTypes = Array.from(new Set(requirements.map((r) => r.documentType)));
  const grouped = DOCUMENT_TYPE_KEYS.map((k) => ({ key: k, docs: docs.filter((d) => d.documentType === k), requiredBy: requirements.filter((r) => r.documentType === k).map((r) => r.customer.name) })).filter((g) => g.docs.length || g.requiredBy.length);

  return (
    <>
      <PageHeader title="Compliance documents" subtitle="Your master copies. Upload once here, then submit to each customer that needs it." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {grouped.length === 0 ? <EmptyState title="No documents yet" body="Upload your current COIs, W-9 and licenses using the form." /> : grouped.map((g) => (
            <Card key={g.key} title={<>{documentTypeLabel(g.key)} {g.requiredBy.length > 0 && <span className="ml-2 font-normal text-xs text-gray-400">required by {g.requiredBy.length} customer{g.requiredBy.length > 1 ? "s" : ""}</span>}</>}>
              {g.docs.length === 0 ? (
                <p className="text-sm text-red-600">Missing. Required by {g.requiredBy.join(", ")}.</p>
              ) : (
                <table className="table">
                  <thead><tr><th>Title</th><th>Issued</th><th>Expires</th><th>Coverage</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {g.docs.map((d) => {
                      const h = documentHealth(d);
                      const days = daysUntil(d.expiresAt);
                      return (
                        <tr key={d.id}>
                          <td>
                            <p className="font-medium">{d.title}</p>
                            <p className="text-xs text-gray-500">{[d.carrier, d.policyNumber].filter(Boolean).join(" · ")}{d.fileName ? <> · <Link href={`/documents/${d.id}/file`} className="text-indigo-600 hover:underline">{d.fileName}</Link></> : <span className="text-amber-700"> · no file attached</span>}</p>
                          </td>
                          <td>{dateShort(d.issuedAt)}</td>
                          <td>{d.expiresAt ? <>{dateShort(d.expiresAt)}<span className="block text-xs text-gray-400">{days! < 0 ? `${-days!} days ago` : `in ${days} days`}</span></> : <span className="text-gray-400">n/a</span>}</td>
                          <td>{d.coverageCents ? money(d.coverageCents) : "—"}</td>
                          <td><StatusBadge status={h} /></td>
                          <td className="text-right"><ConfirmForm action={deleteDocument} message={`Delete ${d.title}?`} inputs={{ id: d.id }} className="text-xs text-gray-400 hover:text-red-600">Delete</ConfirmForm></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {g.requiredBy.length > 0 && g.docs.length > 0 && <p className="mt-3 text-xs text-gray-500">Required by: {g.requiredBy.join(", ")}</p>}
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card title="Upload a document">
            <form action={uploadDocument} className="space-y-3" encType="multipart/form-data">
              <Field label="Type">
                <select name="documentType" className="input" defaultValue={type && DOCUMENT_TYPE_KEYS.includes(type as never) ? type : "COI_GL"}>
                  {DOCUMENT_TYPE_KEYS.map((k) => <option key={k} value={k}>{DOCUMENT_TYPES[k].label}{requiredTypes.includes(k) ? " *" : ""}</option>)}
                </select>
              </Field>
              <Field label="Title"><input name="title" className="input" required placeholder="e.g. GL policy 2026–27" /></Field>
              <Field label="File (PDF, image)"><input name="file" type="file" className="input" accept=".pdf,image/*" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Issued"><input name="issuedAt" type="date" className="input" /></Field>
                <Field label="Expires"><input name="expiresAt" type="date" className="input" /></Field>
              </div>
              <Field label="Coverage amount (insurance)"><input name="coverage" className="input" placeholder="1,000,000" inputMode="decimal" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Carrier"><input name="carrier" className="input" /></Field>
                <Field label="Policy #"><input name="policyNumber" className="input" /></Field>
              </div>
              <Field label="Notes"><input name="notes" className="input" /></Field>
              <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
              <p className="text-xs text-gray-400">* required by at least one customer</p>
            </form>
          </Card>
          <Card title="Tip">
            <p className="text-sm text-gray-600">Ask your insurance agent for a certificate with each management company as certificate holder / additional insured. Upload each customer-specific COI as its own document and note the customer in the title.</p>
            <p className="mt-2 text-xs text-gray-400">{docs.length} document{docs.length === 1 ? "" : "s"} on file · last upload {docs.length ? relative(docs.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt) : "never"}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
