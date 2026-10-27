import type { Customer, Invoice, Property } from "@prisma/client";

/**
 * Builds a CSV of invoices for portals that accept batch uploads
 * (VendorCafe CSV template, Ops Technology Excel import). The portals publish
 * their own templates; this export uses the common columns so it can be pasted
 * into the template, and the column order can be adjusted per portal here.
 */
export function invoiceBatchCsv(rows: (Invoice & { customer: Customer; property: Property | null })[]) {
  const header = [
    "InvoiceNumber",
    "InvoiceDate",
    "DueDate",
    "Customer",
    "VendorNumber",
    "Property",
    "PONumber",
    "WorkOrderNumber",
    "Amount",
    "Description",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.invoiceNumber,
      r.issueDate.toISOString().slice(0, 10),
      r.dueDate.toISOString().slice(0, 10),
      r.customer.name,
      r.customer.vendorNumber ?? "",
      r.property?.name ?? "",
      r.poNumber ?? "",
      r.workOrderNumber ?? "",
      (r.amountCents / 100).toFixed(2),
      r.description ?? "",
    ]
      .map(esc)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}
