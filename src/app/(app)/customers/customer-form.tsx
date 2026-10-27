import type { Customer, PortalAccount } from "@prisma/client";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_KEYS } from "@/lib/document-types";

const DEFAULT_REQUIREMENTS = ["COI_GL", "COI_AUTO", "COI_WC", "W9"];

export function CustomerForm({ customer, portals, action }: { customer?: Customer; portals: PortalAccount[]; action: (fd: FormData) => Promise<void> }) {
  const c = customer;
  return (
    <form action={action} className="space-y-6">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="card p-5 grid gap-4 sm:grid-cols-2">
        <Field label="Management company" className="sm:col-span-2"><input name="name" className="input" required defaultValue={c?.name ?? ""} placeholder="e.g. Cumberland Property Group" /></Field>
        <Field label="Portal they use" hint="Where this customer expects invoices and compliance documents.">
          <select name="portalAccountId" className="input" defaultValue={c?.portalAccountId ?? ""}>
            <option value="">— none / email only —</option>
            {portals.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Invoice method">
          <select name="invoiceMethod" className="input" defaultValue={c?.invoiceMethod ?? "PORTAL"}>
            <option value="PORTAL">Through their portal</option>
            <option value="EMAIL">Email to AP</option>
            <option value="MAIL">Paper mail</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="AP / invoice intake email" hint="AppFolio Smart Bill Entry, Buildium Bill Scan, or the AP inbox."><input name="apEmail" type="email" className="input" defaultValue={c?.apEmail ?? ""} /></Field>
        <Field label="Our vendor # in their system"><input name="vendorNumber" className="input" defaultValue={c?.vendorNumber ?? ""} /></Field>
        <Field label="Contact name"><input name="contactName" className="input" defaultValue={c?.contactName ?? ""} /></Field>
        <Field label="Contact email"><input name="contactEmail" type="email" className="input" defaultValue={c?.contactEmail ?? ""} /></Field>
        <Field label="Contact phone"><input name="contactPhone" className="input" defaultValue={c?.contactPhone ?? ""} /></Field>
        <Field label="Payment terms (days)"><input name="paymentTermsDays" type="number" min={0} className="input" defaultValue={c?.paymentTermsDays ?? 30} /></Field>
        <Field label="Notes" className="sm:col-span-2"><textarea name="notes" className="input" rows={3} defaultValue={c?.notes ?? ""} placeholder="Portal quirks, who approves invoices, PO rules…" /></Field>
        {c && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c.active} /> Active customer</label>
        )}
      </div>

      {!c && (
        <div className="card p-5">
          <p className="mb-3 text-sm font-semibold">What do they require from us?</p>
          <p className="mb-3 text-xs text-gray-500">You can adjust coverage minimums and add more later.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DOCUMENT_TYPE_KEYS.filter((k) => k !== "OTHER").map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="requirements" value={k} defaultChecked={DEFAULT_REQUIREMENTS.includes(k)} />
                {DOCUMENT_TYPES[k].label}
              </label>
            ))}
          </div>
        </div>
      )}
      <SubmitButton>{c ? "Save changes" : "Create customer"}</SubmitButton>
    </form>
  );
}
