/* Demo data: a Nashville junk-removal vendor with several management-company customers. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptSecret } from "../src/lib/crypto";

const prisma = new PrismaClient();
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

async function main() {
  const email = "demo@vendorsync.local";
  if (await prisma.user.findUnique({ where: { email } })) {
    console.log("Demo data already present.");
    return;
  }
  const vendor = await prisma.vendor.create({
    data: {
      name: "Music City Removal",
      legalName: "Music City Removal LLC",
      ein: "12-3456789",
      phone: "(615) 555-0142",
      email: "billing@musiccityremoval.example",
      address: "1200 Division St",
      city: "Nashville",
      state: "TN",
      zip: "37203",
      remitTo: "Music City Removal LLC\n1200 Division St, Nashville TN 37203\nACH details on file / checks payable to Music City Removal LLC",
      users: { create: { email, name: "Al Demo", role: "OWNER", passwordHash: await bcrypt.hash("vendorsync", 10) } },
    },
  });
  const v = vendor.id;

  const [ops, cafe, netvendor, paymode, appfolio] = await Promise.all([
    prisma.portalAccount.create({ data: { vendorId: v, provider: "OPS_TECHNOLOGY", label: "Ops Technology", loginUrl: "https://www.opstechnology.com/", username: "al@musiccityremoval.example", encryptedSecret: encryptSecret("demo-password"), status: "CONNECTED", lastSyncAt: days(-2), lastSyncResult: "Portal reachable (200). Credentials stored; sign-in is manual.", notes: "Per-invoice fee billed monthly by RealPage." } }),
    prisma.portalAccount.create({ data: { vendorId: v, provider: "VENDORCAFE", label: "VendorCafe (Yardi clients)", username: "al@musiccityremoval.example", encryptedSecret: encryptSecret("demo-password"), status: "NEEDS_ATTENTION", lastSyncAt: days(-9), lastSyncResult: "VendorShield shows GL certificate expiring.", notes: "VendorShield fee $110/yr due in March." } }),
    prisma.portalAccount.create({ data: { vendorId: v, provider: "NETVENDOR", label: "NetVendor", username: "al@musiccityremoval.example", status: "CONNECTED", lastSyncAt: days(-1), notes: "$99/yr per management company." } }),
    prisma.portalAccount.create({ data: { vendorId: v, provider: "PAYMODE_X", label: "Paymode", username: "al@musiccityremoval.example", status: "CONNECTED", lastSyncAt: days(-3), notes: "Basic (free) tier; remittance emails to billing@." } }),
    prisma.portalAccount.create({ data: { vendorId: v, provider: "APPFOLIO", label: "AppFolio Vendor Portal", status: "CONNECTED", lastSyncAt: days(-5) } }),
  ]);

  const mk = (data: Parameters<typeof prisma.customer.create>[0]["data"]) => prisma.customer.create({ data, include: { properties: true } });
  const cumberland = await mk({
    vendorId: v, name: "Cumberland Property Group", portalAccountId: ops.id, invoiceMethod: "PORTAL", paymentTermsDays: 30, vendorNumber: "V-20418",
    contactName: "Dana Whitfield", contactEmail: "dana.whitfield@cumberlandpg.example", apEmail: "ap@cumberlandpg.example",
    notes: "POs required for anything over $500. Invoices must match PO amount exactly.",
    properties: { create: [{ name: "The Gulch Lofts", address: "500 11th Ave S", city: "Nashville", state: "TN", zip: "37203", unitCount: 212 }, { name: "Riverwalk Flats", address: "88 Cumberland Bend", city: "Nashville", state: "TN", zip: "37228", unitCount: 160 }] },
    requirements: { create: [
      { documentType: "COI_GL", minCoverageCents: 100_000_000, additionalInsured: true, status: "APPROVED", submittedAt: days(-200), reviewedAt: days(-195) },
      { documentType: "COI_AUTO", minCoverageCents: 100_000_000, status: "APPROVED", submittedAt: days(-200), reviewedAt: days(-195) },
      { documentType: "COI_WC", status: "APPROVED", submittedAt: days(-200), reviewedAt: days(-195) },
      { documentType: "W9", status: "APPROVED", submittedAt: days(-400), reviewedAt: days(-398) },
    ] },
  });
  const harpeth = await mk({
    vendorId: v, name: "Harpeth Residential", portalAccountId: cafe.id, invoiceMethod: "PORTAL", paymentTermsDays: 45, vendorNumber: "MCR001",
    contactName: "Marcus Lee", contactEmail: "mlee@harpethres.example",
    properties: { create: [{ name: "Bellevue Commons", city: "Nashville", state: "TN", unitCount: 304 }, { name: "Franklin Park Apartments", city: "Franklin", state: "TN", unitCount: 188 }] },
    requirements: { create: [
      { documentType: "COI_GL", minCoverageCents: 200_000_000, additionalInsured: true, status: "APPROVED", submittedAt: days(-300), reviewedAt: days(-290), notes: "Needs Harpeth Residential and its affiliates as additional insured" },
      { documentType: "COI_UMBRELLA", minCoverageCents: 100_000_000, status: "NOT_SUBMITTED" },
      { documentType: "COI_WC", status: "APPROVED", submittedAt: days(-300), reviewedAt: days(-290) },
      { documentType: "W9", status: "APPROVED", submittedAt: days(-300), reviewedAt: days(-290) },
      { documentType: "BACKGROUND_CHECK", status: "REJECTED", submittedAt: days(-12), reviewedAt: days(-10), rejectionReason: "Attestation must be on company letterhead" },
    ] },
  });
  const riverfront = await mk({
    vendorId: v, name: "Riverfront Management", portalAccountId: netvendor.id, invoiceMethod: "EMAIL", apEmail: "invoices@riverfrontmgmt.example", paymentTermsDays: 30,
    contactName: "Priya Natarajan", contactEmail: "priya@riverfrontmgmt.example",
    properties: { create: [{ name: "East Bank Towers", city: "Nashville", state: "TN", unitCount: 420 }] },
    requirements: { create: [
      { documentType: "COI_GL", minCoverageCents: 100_000_000, additionalInsured: true, status: "SUBMITTED", submittedAt: days(-3) },
      { documentType: "COI_AUTO", status: "SUBMITTED", submittedAt: days(-3) },
      { documentType: "COI_WC", status: "SUBMITTED", submittedAt: days(-3) },
      { documentType: "W9", status: "SUBMITTED", submittedAt: days(-3) },
      { documentType: "BUSINESS_LICENSE", status: "NOT_SUBMITTED" },
    ] },
  });
  const bluegrass = await mk({
    vendorId: v, name: "Bluegrass Living", portalAccountId: appfolio.id, invoiceMethod: "PORTAL", paymentTermsDays: 15,
    contactName: "Tom Reeves", contactEmail: "treeves@bluegrassliving.example",
    properties: { create: [{ name: "Shelby Avenue Townhomes", city: "Nashville", state: "TN", unitCount: 64 }] },
    requirements: { create: [
      { documentType: "COI_GL", minCoverageCents: 100_000_000, status: "APPROVED", submittedAt: days(-100), reviewedAt: days(-98) },
      { documentType: "W9", status: "APPROVED", submittedAt: days(-100), reviewedAt: days(-98) },
    ] },
  });
  await prisma.portalAccount.update({ where: { id: appfolio.id }, data: { intakeEmail: "bills+bluegrass@appfolio-intake.example" } });

  // Documents
  const gl = await prisma.complianceDocument.create({ data: { vendorId: v, documentType: "COI_GL", title: "GL policy 2025–26", issuedAt: days(-340), expiresAt: days(25), coverageCents: 100_000_000, carrier: "Erie Insurance", policyNumber: "GL-8841-220" } });
  await prisma.complianceDocument.create({ data: { vendorId: v, documentType: "COI_AUTO", title: "Commercial auto 2026", issuedAt: days(-120), expiresAt: days(245), coverageCents: 100_000_000, carrier: "Progressive Commercial", policyNumber: "CA-55120" } });
  await prisma.complianceDocument.create({ data: { vendorId: v, documentType: "COI_WC", title: "Workers' comp 2026", issuedAt: days(-60), expiresAt: days(305), carrier: "Tennessee Workers Comp Fund", policyNumber: "WC-10093" } });
  await prisma.complianceDocument.create({ data: { vendorId: v, documentType: "W9", title: "W-9 (signed Jan 2026)", issuedAt: days(-290) } });
  await prisma.complianceDocument.create({ data: { vendorId: v, documentType: "BUSINESS_LICENSE", title: "Metro Nashville business license", issuedAt: days(-400), expiresAt: days(-35) } });
  await prisma.complianceDocument.create({ data: { vendorId: v, documentType: "BACKGROUND_CHECK", title: "Background check attestation", issuedAt: days(-12), expiresAt: days(353) } });
  // Mark GL as the submitted doc for approved customers
  await prisma.complianceRequirement.updateMany({ where: { documentType: "COI_GL", status: "APPROVED" }, data: { submittedDocumentId: gl.id } });

  // Invoices
  const inv = async (customer: { id: string; properties: { id: string }[] }, n: string, amount: number, daysAgo: number, status: string, extra: Record<string, unknown> = {}, terms = 30) => {
    const issueDate = days(-daysAgo);
    return prisma.invoice.create({
      data: {
        vendorId: v, customerId: customer.id, propertyId: customer.properties[0]?.id, invoiceNumber: n, issueDate, dueDate: new Date(issueDate.getTime() + terms * 86_400_000), amountCents: amount, status,
        lineItems: { create: [{ description: "Junk removal – unit turnover haul-away", quantity: 1, unitPriceCents: amount - 15_000, totalCents: amount - 15_000, sortOrder: 0 }, { description: "Mattress disposal fee", quantity: 1, unitPriceCents: 15_000, totalCents: 15_000, sortOrder: 1 }] },
        ...extra,
      },
    });
  };
  const i1 = await inv(cumberland, "INV-2026-0141", 48_500, 40, "PAID", { poNumber: "PO-77812" });
  await prisma.payment.create({ data: { vendorId: v, customerId: cumberland.id, invoiceId: i1.id, amountCents: 48_500, paidAt: days(-8), method: "ACH", reference: "RP-ACH-99120" } });
  const i2 = await inv(cumberland, "INV-2026-0147", 72_000, 22, "SUBMITTED", { poNumber: "PO-78004" });
  await prisma.invoiceSubmission.create({ data: { invoiceId: i2.id, portalAccountId: ops.id, method: "MANUAL", status: "SENT", externalRef: "OPS-4410923", submittedAt: days(-21), responseAt: days(-21), message: "Uploaded against PO-78004." } });
  await inv(cumberland, "INV-2026-0152", 36_000, 3, "READY", { poNumber: "PO-78231" });
  const i4 = await inv(harpeth, "INV-2026-0149", 125_000, 50, "SUBMITTED", {}, 45);
  await prisma.invoiceSubmission.create({ data: { invoiceId: i4.id, portalAccountId: cafe.id, method: "MANUAL", status: "SENT", externalRef: "VC-2210045", submittedAt: days(-48), responseAt: days(-48) } });
  const i5 = await inv(harpeth, "INV-2026-0150", 64_000, 30, "REJECTED", {}, 45);
  await prisma.invoiceSubmission.create({ data: { invoiceId: i5.id, portalAccountId: cafe.id, method: "MANUAL", status: "REJECTED", submittedAt: days(-29), responseAt: days(-25), message: "Rejected in VendorCafe: property code missing." } });
  await prisma.invoice.update({ where: { id: i5.id }, data: { notes: "2026-09-30: Rejected – property code missing. Re-enter with property code BELLCOM." } });
  const i6 = await inv(riverfront, "INV-2026-0151", 29_500, 6, "SUBMITTED");
  await prisma.invoiceSubmission.create({ data: { invoiceId: i6.id, method: "EMAIL", status: "SENT", externalRef: "<msg-8812@vendorsync>", submittedAt: days(-6), message: "Emailed to invoices@riverfrontmgmt.example." } });
  await inv(bluegrass, "INV-2026-0153", 18_000, 1, "READY", {}, 15);
  const i8 = await inv(bluegrass, "INV-2026-0138", 22_500, 60, "PAID", {}, 15);
  await prisma.payment.create({ data: { vendorId: v, customerId: bluegrass.id, invoiceId: i8.id, amountCents: 22_500, paidAt: days(-40), method: "CHECK", reference: "1042" } });

  await prisma.activity.createMany({
    data: [
      { vendorId: v, kind: "WARNING", message: "VendorCafe: VendorShield shows GL certificate expiring.", href: `/portals/${cafe.id}`, createdAt: days(-9) },
      { vendorId: v, kind: "WARNING", message: "Harpeth Residential: background check marked rejected", href: `/customers/${harpeth.id}`, createdAt: days(-10) },
      { vendorId: v, kind: "SUCCESS", message: "Payment of $485.00 recorded from Cumberland Property Group", href: "/payments", createdAt: days(-8) },
      { vendorId: v, kind: "SUCCESS", message: "Invoice INV-2026-0151 → Riverfront Management: Emailed to invoices@riverfrontmgmt.example.", href: `/invoices/${i6.id}`, createdAt: days(-6) },
      { vendorId: v, kind: "INFO", message: "Created invoice INV-2026-0153 for Bluegrass Living", createdAt: days(-1) },
    ],
  });
  console.log("Seeded demo vendor. Login: demo@vendorsync.local / vendorsync");
  void paymode;
}

main().finally(() => prisma.$disconnect());
