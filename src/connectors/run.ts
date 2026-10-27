import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { readStoredFile } from "@/lib/storage";
import { getConnector } from "./registry";
import { emailConnector } from "./providers/email";
import type { ConnectorContext, PortalConnector, SubmissionResult } from "./types";

function buildContext(
  vendor: ConnectorContext["vendor"],
  account: ConnectorContext["account"],
  lines: string[]
): ConnectorContext {
  return {
    vendor,
    account,
    getSecret: () => (account.encryptedSecret ? decryptSecret(account.encryptedSecret) : null),
    log: (l) => lines.push(`${new Date().toISOString()} ${l}`),
  };
}

/** Runs a connector job for a portal account and records it as a SyncJob. */
export async function runPortalJob(
  portalAccountId: string,
  kind: "TEST_CONNECTION" | "COMPLIANCE_SYNC" | "PAYMENT_PULL"
) {
  const account = await prisma.portalAccount.findUniqueOrThrow({ where: { id: portalAccountId }, include: { vendor: true } });
  const connector = getConnector(account.provider);
  const job = await prisma.syncJob.create({ data: { portalAccountId, kind, status: "RUNNING", startedAt: new Date() } });
  const lines: string[] = [];
  const ctx = buildContext(account.vendor, account, lines);

  const fn: PortalConnector["testConnection"] | undefined =
    kind === "TEST_CONNECTION" ? connector.testConnection?.bind(connector)
    : kind === "COMPLIANCE_SYNC" ? connector.syncCompliance?.bind(connector)
    : connector.pullPayments?.bind(connector);

  let result;
  if (!fn) {
    result = { ok: false, message: `${connector.name} does not support ${kind.toLowerCase().replace("_", " ")} (${connector.mode} mode).` };
  } else {
    try {
      result = await fn(ctx);
    } catch (e) {
      result = { ok: false, message: (e as Error).message };
    }
  }
  lines.push(`${new Date().toISOString()} ${result.ok ? "OK" : "FAILED"}: ${result.message}`);

  await prisma.syncJob.update({
    where: { id: job.id },
    data: { status: fn ? (result.ok ? "SUCCEEDED" : "FAILED") : "SKIPPED", finishedAt: new Date(), log: lines.join("\n") },
  });
  await prisma.portalAccount.update({
    where: { id: portalAccountId },
    data: {
      lastSyncAt: new Date(),
      lastSyncResult: result.message,
      status: result.ok ? "CONNECTED" : account.status === "DISCONNECTED" ? "DISCONNECTED" : "NEEDS_ATTENTION",
    },
  });
  await prisma.activity.create({
    data: {
      vendorId: account.vendorId,
      kind: result.ok ? "SUCCESS" : "WARNING",
      message: `${connector.name}: ${result.message}`,
      href: `/portals/${portalAccountId}`,
    },
  });
  return result;
}

/** Submits an invoice through the customer's portal (or email) and records the submission. */
export async function submitInvoice(invoiceId: string): Promise<SubmissionResult> {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { vendor: true, customer: { include: { portalAccount: true } }, property: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  const { vendor, customer, property, lineItems } = invoice;

  // Pick the route: the customer's portal account, or plain email when invoiceMethod is EMAIL.
  let account = customer.portalAccount;
  let connector: PortalConnector;
  if (customer.invoiceMethod === "EMAIL" || !account) {
    connector = emailConnector;
    account =
      account ??
      ({
        id: "",
        vendorId: vendor.id,
        provider: "EMAIL",
        label: "Email",
        loginUrl: null,
        username: null,
        encryptedSecret: null,
        intakeEmail: customer.apEmail,
        status: "CONNECTED",
        lastSyncAt: null,
        lastSyncResult: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as NonNullable<typeof account>);
  } else {
    connector = getConnector(account.provider);
    // Portals that accept emailed invoices: route through email when an intake address is set.
    if (account.intakeEmail && (connector.mode === "EMAIL" || connector.mode === "BROWSER" || connector.mode === "MANUAL")) {
      connector = emailConnector;
    }
  }

  const pdf = invoice.storageKey ? await readStoredFile(invoice.storageKey) : await renderInvoicePdf({ vendor, customer, property, invoice, lineItems });
  const pdfFileName = invoice.fileName ?? `Invoice-${invoice.invoiceNumber}.pdf`;

  const lines: string[] = [];
  const ctx = buildContext(vendor, account, lines);
  let result: SubmissionResult;
  try {
    result = connector.submitInvoice
      ? await connector.submitInvoice(ctx, { vendor, customer, property, invoice, lineItems, pdf, pdfFileName })
      : { ok: false, status: "FAILED", message: `${connector.name} cannot submit invoices.` };
  } catch (e) {
    result = { ok: false, status: "FAILED", message: (e as Error).message };
  }

  await prisma.invoiceSubmission.create({
    data: {
      invoiceId,
      portalAccountId: account.id || null,
      method: connector.mode,
      status: result.status,
      externalRef: result.externalRef,
      message: [result.message, ...lines].join("\n"),
    },
  });
  if (result.status === "SENT" || result.status === "ACCEPTED") {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "SUBMITTED" } });
  } else if (result.status === "PENDING" && invoice.status === "DRAFT") {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "READY" } });
  }
  await prisma.activity.create({
    data: {
      vendorId: vendor.id,
      kind: result.ok ? "SUCCESS" : "ERROR",
      message: `Invoice ${invoice.invoiceNumber} → ${customer.name}: ${result.message}`,
      href: `/invoices/${invoiceId}`,
    },
  });
  return result;
}
