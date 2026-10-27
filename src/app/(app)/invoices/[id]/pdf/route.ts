import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const invoice = await prisma.invoice.findFirst({
    where: { id, vendorId: user.vendorId },
    include: { vendor: true, customer: true, property: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) return new NextResponse("Not found", { status: 404 });
  const buf = invoice.storageKey ? await readStoredFile(invoice.storageKey) : await renderInvoicePdf({ vendor: invoice.vendor, customer: invoice.customer, property: invoice.property, invoice, lineItems: invoice.lineItems });
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"` },
  });
}
