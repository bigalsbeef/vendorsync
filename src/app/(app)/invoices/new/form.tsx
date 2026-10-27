"use client";
import { useMemo, useState } from "react";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type CustomerOpt = { id: string; name: string; paymentTermsDays: number; route: string; properties: { id: string; name: string }[] };
type Line = { description: string; quantity: string; unitPrice: string };

export function InvoiceForm({ customers, defaultCustomerId, defaults, action }: { customers: CustomerOpt[]; defaultCustomerId?: string; defaults: { invoiceNumber: string; issueDate: string }; action: (fd: FormData) => Promise<void> }) {
  const [customerId, setCustomerId] = useState(defaultCustomerId && customers.some((c) => c.id === defaultCustomerId) ? defaultCustomerId : customers[0].id);
  const [issueDate, setIssueDate] = useState(defaults.issueDate);
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const customer = customers.find((c) => c.id === customerId)!;
  const due = useMemo(() => {
    const d = new Date(issueDate || Date.now());
    d.setDate(d.getDate() + customer.paymentTermsDays);
    return d.toISOString().slice(0, 10);
  }, [issueDate, customer.paymentTermsDays]);
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(String(l.unitPrice).replace(/[^0-9.]/g, "")) || 0), 0);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3" encType="multipart/form-data">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-5 grid gap-4 sm:grid-cols-2">
          <Field label="Customer" className="sm:col-span-2">
            <select name="customerId" className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span className="mt-1 block text-xs text-gray-500">Submits via: <span className="font-medium">{customer.route}</span> · Net {customer.paymentTermsDays}</span>
          </Field>
          <Field label="Property">
            <select name="propertyId" className="input" defaultValue="" key={customerId}>
              <option value="">— none —</option>
              {customer.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Invoice #"><input name="invoiceNumber" className="input" required defaultValue={defaults.invoiceNumber} /></Field>
          <Field label="Invoice date"><input name="issueDate" type="date" className="input" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Field>
          <Field label="Due date" hint={`Defaults to Net ${customer.paymentTermsDays}`}><input name="dueDate" type="date" className="input" key={due} defaultValue={due} /></Field>
          <Field label="PO #"><input name="poNumber" className="input" /></Field>
          <Field label="Work order #"><input name="workOrderNumber" className="input" /></Field>
          <Field label="Description / memo (printed on invoice)" className="sm:col-span-2"><textarea name="description" className="input" rows={2} placeholder="Junk removal – unit 204 turnover, 1 truckload" /></Field>
        </div>

        <div className="card p-5">
          <p className="mb-3 text-sm font-semibold">Line items</p>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input name="li_description" className="input col-span-7" placeholder="Description" value={l.description} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                <input name="li_quantity" className="input col-span-2" placeholder="Qty" inputMode="decimal" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                <input name="li_unitPrice" className="input col-span-2" placeholder="Unit $" inputMode="decimal" value={l.unitPrice} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} />
                <button type="button" className="col-span-1 text-gray-400 hover:text-red-600" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines)} aria-label="Remove line">×</button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" className="text-sm text-indigo-600" onClick={() => setLines([...lines, { description: "", quantity: "1", unitPrice: "" }])}>+ Add line</button>
            <p className="text-sm">Total <span className="text-lg font-semibold">{total.toLocaleString("en-US", { style: "currency", currency: "USD" })}</span></p>
          </div>
          <p className="mt-2 text-xs text-gray-400">No line items? Enter a flat amount instead:</p>
          <input name="amount" className="input mt-1 max-w-xs" placeholder="0.00" inputMode="decimal" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="card p-5 space-y-3">
          <Field label="Attach your own PDF (optional)" hint="If you invoice from QuickBooks/Jobber, attach that PDF and VendorSync will send it instead of generating one.">
            <input name="file" type="file" accept=".pdf" className="input" />
          </Field>
          <Field label="Internal notes"><textarea name="notes" className="input" rows={3} /></Field>
          <SubmitButton className="btn-primary w-full" pendingText="Saving…">Save invoice</SubmitButton>
          <p className="text-xs text-gray-500">You can preview the PDF and submit it from the next screen.</p>
        </div>
      </div>
    </form>
  );
}
