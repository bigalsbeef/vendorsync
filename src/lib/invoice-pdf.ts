import PDFDocument from "pdfkit";
import type { Customer, Invoice, InvoiceLineItem, Property, Vendor } from "@prisma/client";
import { dateShort, money } from "./format";

export type InvoiceRenderInput = {
  vendor: Vendor;
  customer: Customer;
  property: Property | null;
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
};

/** Renders a clean one-page invoice PDF as a Buffer. */
export function renderInvoicePdf(input: InvoiceRenderInput): Promise<Buffer> {
  const { vendor, customer, property, invoice, lineItems } = input;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text(vendor.name, 50, 50);
    doc.fontSize(9).font("Helvetica").fillColor("#555");
    [vendor.address, [vendor.city, vendor.state, vendor.zip].filter(Boolean).join(", "), vendor.phone, vendor.email]
      .filter(Boolean)
      .forEach((l) => doc.text(String(l)));
    doc.fillColor("#000");

    doc.fontSize(26).font("Helvetica-Bold").text("INVOICE", 350, 50, { align: "right" });
    doc.fontSize(10).font("Helvetica");
    const meta: [string, string][] = [
      ["Invoice #", invoice.invoiceNumber],
      ["Date", dateShort(invoice.issueDate)],
      ["Due", dateShort(invoice.dueDate)],
    ];
    if (invoice.poNumber) meta.push(["PO #", invoice.poNumber]);
    if (invoice.workOrderNumber) meta.push(["Work Order #", invoice.workOrderNumber]);
    if (customer.vendorNumber) meta.push(["Vendor #", customer.vendorNumber]);
    let y = 85;
    for (const [k, v] of meta) {
      doc.font("Helvetica-Bold").text(k, 350, y, { width: 100, align: "right" });
      doc.font("Helvetica").text(v, 455, y, { width: 107, align: "right" });
      y += 14;
    }

    // Bill to
    y = Math.max(y, 150) + 20;
    doc.font("Helvetica-Bold").fontSize(10).text("BILL TO", 50, y);
    doc.font("Helvetica").text(customer.name, 50, y + 14);
    if (customer.contactName) doc.text(customer.contactName);
    if (customer.apEmail) doc.text(customer.apEmail);
    if (property) {
      doc.font("Helvetica-Bold").text("PROPERTY", 320, y);
      doc.font("Helvetica").text(property.name, 320, y + 14);
      if (property.address) doc.text(property.address);
      const cityLine = [property.city, property.state, property.zip].filter(Boolean).join(", ");
      if (cityLine) doc.text(cityLine);
    }

    // Line items
    y = doc.y + 30;
    const cols = { desc: 50, qty: 370, unit: 430, total: 500 };
    doc.rect(50, y - 4, 512, 18).fill("#f0f0f0").fillColor("#000");
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Description", cols.desc + 4, y);
    doc.text("Qty", cols.qty, y, { width: 50, align: "right" });
    doc.text("Unit", cols.unit, y, { width: 60, align: "right" });
    doc.text("Amount", cols.total, y, { width: 62, align: "right" });
    y += 22;
    doc.font("Helvetica").fontSize(10);
    const items = lineItems.length
      ? lineItems
      : [{ description: invoice.description ?? "Services rendered", quantity: 1, unitPriceCents: invoice.amountCents, totalCents: invoice.amountCents }];
    for (const li of items) {
      const h = doc.heightOfString(li.description, { width: 310 });
      doc.text(li.description, cols.desc + 4, y, { width: 310 });
      doc.text(String(li.quantity), cols.qty, y, { width: 50, align: "right" });
      doc.text(money(li.unitPriceCents), cols.unit, y, { width: 60, align: "right" });
      doc.text(money(li.totalCents), cols.total, y, { width: 62, align: "right" });
      y += Math.max(h, 12) + 8;
    }
    doc.moveTo(50, y).lineTo(562, y).strokeColor("#999").stroke();
    y += 10;
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Total Due", cols.qty, y, { width: 110, align: "right" });
    doc.text(money(invoice.amountCents), cols.total, y, { width: 62, align: "right" });

    // Footer
    y += 40;
    doc.font("Helvetica").fontSize(9).fillColor("#555");
    if (invoice.description && lineItems.length) doc.text(invoice.description, 50, y, { width: 512 });
    if (vendor.remitTo) {
      doc.moveDown().font("Helvetica-Bold").text("Remit to:").font("Helvetica").text(vendor.remitTo);
    }
    doc.moveDown().text(`Payment terms: Net ${customer.paymentTermsDays}. Thank you for your business.`);
    doc.end();
  });
}
