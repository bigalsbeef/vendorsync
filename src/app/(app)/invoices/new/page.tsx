import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toDateInput } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import Link from "next/link";
import { InvoiceForm } from "./form";
import { createInvoice } from "../actions";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const user = await requireUser();
  const { customer } = await searchParams;
  const [customers, last] = await Promise.all([
    prisma.customer.findMany({ where: { vendorId: user.vendorId, active: true }, include: { properties: { orderBy: { name: "asc" } }, portalAccount: true }, orderBy: { name: "asc" } }),
    prisma.invoice.findFirst({ where: { vendorId: user.vendorId }, orderBy: { invoiceNumber: "desc" } }),
  ]);
  if (customers.length === 0) return <EmptyState title="Add a customer first" action={<Link href="/customers/new" className="btn-primary btn-sm">Add customer</Link>} />;
  const suggested = nextNumber(last?.invoiceNumber);
  return (
    <>
      <PageHeader title="New invoice" subtitle="VendorSync generates the PDF and routes it to the customer's portal or AP inbox." />
      <InvoiceForm
        customers={customers.map((c) => ({ id: c.id, name: c.name, paymentTermsDays: c.paymentTermsDays, route: c.portalAccount?.label ?? (c.invoiceMethod === "EMAIL" ? `Email${c.apEmail ? ` → ${c.apEmail}` : ""}` : c.invoiceMethod), properties: c.properties.map((p) => ({ id: p.id, name: p.name })) }))}
        defaultCustomerId={customer}
        defaults={{ invoiceNumber: suggested, issueDate: toDateInput(new Date()) }}
        action={createInvoice}
      />
    </>
  );
}

function nextNumber(prev?: string) {
  if (!prev) return `INV-${new Date().getFullYear()}-0001`;
  const m = prev.match(/^(.*?)(\d+)$/);
  if (!m) return "";
  return m[1] + String(Number(m[2]) + 1).padStart(m[2].length, "0");
}
