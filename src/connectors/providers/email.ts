import { sendMail, smtpConfigured } from "../mailer";
import type { PortalConnector } from "../types";

/**
 * Generic "send the invoice to the customer's AP mailbox" connector.
 * Also used by portal connectors whose portals accept emailed invoices.
 */
export const emailConnector: PortalConnector = {
  key: "EMAIL",
  name: "Email to AP",
  owner: "—",
  website: "",
  defaultLoginUrl: "",
  mode: "EMAIL",
  handles: ["INVOICES", "COMPLIANCE"],
  summary: "Customer accepts invoices and compliance documents by email to their accounts-payable inbox.",
  integrationNotes:
    "VendorSync generates the invoice PDF and emails it to the customer's AP address (or the portal's intake address) with a consistent subject line. Delivery is confirmed by SMTP; acceptance still has to be confirmed by the customer or by checking their portal.",
  manualSteps: {
    submitInvoice: [
      "Confirm the customer's AP / invoice intake email address on the customer record.",
      "Click Submit; VendorSync emails the PDF and records the submission.",
      "Mark the invoice Approved or Paid when the customer confirms.",
    ],
  },
  async testConnection() {
    return smtpConfigured()
      ? { ok: true, message: "SMTP is configured; invoices will be emailed." }
      : { ok: false, message: "SMTP is not configured (SMTP_HOST / SMTP_USER). Emails will be logged, not sent." };
  },
  async submitInvoice(ctx, p) {
    const to = ctx.account.intakeEmail || p.customer.apEmail;
    if (!to) return { ok: false, status: "FAILED", message: "No AP / intake email address on the customer or portal account." };
    const subject = `Invoice ${p.invoice.invoiceNumber} from ${p.vendor.name}${p.property ? ` – ${p.property.name}` : ""}`;
    const text = [
      `Please find attached invoice ${p.invoice.invoiceNumber} for ${(p.invoice.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}.`,
      p.property ? `Property: ${p.property.name}` : null,
      p.invoice.poNumber ? `PO #: ${p.invoice.poNumber}` : null,
      p.invoice.workOrderNumber ? `Work order #: ${p.invoice.workOrderNumber}` : null,
      p.customer.vendorNumber ? `Vendor #: ${p.customer.vendorNumber}` : null,
      "",
      `Thank you,`,
      p.vendor.name,
      p.vendor.phone ?? "",
    ]
      .filter((l) => l !== null)
      .join("\n");
    const r = await sendMail({
      to,
      replyTo: p.vendor.email ?? undefined,
      subject,
      text,
      attachments: [{ filename: p.pdfFileName, content: p.pdf, contentType: "application/pdf" }],
    });
    ctx.log(r.info);
    return r.sent
      ? { ok: true, status: "SENT", message: `Emailed to ${to}. ${r.info}`, externalRef: r.messageId }
      : { ok: false, status: "PENDING", message: `${r.info} (addressed to ${to})` };
  },
};
