import { definePortal } from "./manual-base";
import type { PortalConnector } from "../types";

// Metadata + checklists for the portals property-management vendors actually
// get pushed into. Integration mode reflects what each portal exposes to the
// VENDOR side today (none offer a self-serve vendor API). Research and sources
// are in docs/INTEGRATIONS.md.

export const opsTechnology = definePortal({
  key: "OPS_TECHNOLOGY",
  name: "Ops Technology",
  owner: "RealPage",
  website: "https://www.realpage.com/vendor-services/",
  defaultLoginUrl: "https://www.opstechnology.com/",
  mode: "MANUAL",
  handles: ["INVOICES", "COMPLIANCE"],
  summary: "RealPage's purchasing and e-invoicing portal (Spend Management / OpsInvoice). Properties issue POs; vendors flip POs to invoices or upload invoices against them. Per-invoice vendor fees apply.",
  integrationNotes:
    "No public vendor API; RealPage's APIs are partner-only and do not accept file uploads. Vendors submit in the web portal, via an Excel invoice import, or a Windows QuickBooks plugin (enabled per property by an Ops rep). VendorSync tracks every invoice owed, generates the PDF, and can export an invoice batch CSV you paste into the Excel import template. Browser automation is possible but RealPage's terms were not verified, so it is off by default.",
  manualSteps: {
    submitInvoice: [
      "Sign in to Ops Technology and open Invoices → Create Invoice (or flip the matching PO).",
      "Select the property and PO number shown on this invoice.",
      "Enter the invoice number, date, and amount exactly as on the VendorSync PDF, then attach the PDF.",
      "Submit, copy the Ops confirmation number into the submission record, and mark it Sent.",
    ],
    updateCompliance: [
      "Sign in → Vendor Profile → Compliance / Documents.",
      "Upload the current COI and W-9; make sure the certificate holder matches the management company.",
      "Record the submission date on the customer's requirement in VendorSync.",
    ],
  },
});

export const vendorCafe = definePortal({
  key: "VENDORCAFE",
  name: "VendorCafe",
  owner: "Yardi",
  website: "https://www.yardi.com/product/vendorcafe/",
  defaultLoginUrl: "https://www.vendorcafe.com/",
  mode: "MANUAL",
  handles: ["INVOICES", "COMPLIANCE", "PAYMENTS"],
  summary: "Yardi's vendor portal (Procure to Pay): onboarding, COI/W-9 via VendorShield, invoice entry or upload, invoice and payment status. One login spans every Yardi client you serve; free to vendors (Bill Pay charges a per-payment fee).",
  integrationNotes:
    "Yardi exposes APIs to its property-management clients and certified partners, not to vendors. Submission routes: manual entry, CSV template upload inside VendorCafe, or EDI via Yardi Marketplace (enterprise). VendorSync exports an invoice batch CSV matched to the VendorCafe template, tracks invoice status, and reminds you of VendorShield expirations. Some clients also route emailed invoices into PAYscan through a capture vendor; if they give you an address, set it as the intake email.",
  manualSteps: {
    submitInvoice: [
      "Sign in to VendorCafe → Invoices → Create Invoice (or Upload CSV for a batch).",
      "Choose the client and property, enter invoice number, date, amount, and attach the VendorSync PDF.",
      "Submit and record the VendorCafe invoice ID on the submission.",
    ],
    updateCompliance: [
      "Sign in → VendorShield → upload the renewed COI.",
      "Confirm the additional-insured wording matches the client's requirement.",
    ],
  },
});

export const netVendor = definePortal({
  key: "NETVENDOR",
  name: "NetVendor",
  owner: "NetVendor Inc.",
  website: "https://www.netvendor.com/vendors",
  defaultLoginUrl: "https://app.netvendor.com/",
  mode: "MANUAL",
  handles: ["COMPLIANCE"],
  summary: "Vendor compliance and credentialing (COI verification, W-9/TIN match, OFAC, background checks) for management companies on Yardi, RealPage, Entrata, MRI, AppFolio and others. Annual vendor fee per management company (about $49–$149).",
  integrationNotes:
    "No vendor API or developer program. Compliance status lives in the NetVendor web app and COI requests go to your insurance agent. VendorSync mirrors each customer's requirements and reminds you before NetVendor flags you non-compliant.",
  manualSteps: {
    updateCompliance: [
      "Sign in → Compliance → the customer that is flagged.",
      "Upload the new certificate against the specific requirement (GL, Auto, WC, Umbrella).",
      "Wait for NetVendor review (typically 1–3 business days) and update the status in VendorSync.",
    ],
  },
});

export const paymode = definePortal({
  key: "PAYMODE_X",
  name: "Paymode (Paymode-X / Nexus)",
  owner: "Bottomline",
  website: "https://www.bottomline.com/paymode-x",
  defaultLoginUrl: "https://secure.paymode.com/",
  mode: "MANUAL",
  handles: ["PAYMENTS", "INVOICES"],
  summary: "Bottomline's B2B payment network. Customers on Paymode (including former Nexus / NexusConnect payers, migrated Dec 2024) pay by ACH or virtual card; vendors see remittance detail and, with Premium Invoice Delivery, upload invoices and track status under one login. Basic is free; Premium charges a network fee per payment.",
  integrationNotes:
    "Bottomline's developer portal (api.paymode.com) targets paying enterprises and ERP connections; no payee-side self-serve API is published. Remittance advices arrive by email and as CSV/CTX exports. VendorSync records payments against invoices; import the remittance CSV to reconcile. Invoice upload is manual (or ERP-to-Paymode for Premium vendors).",
  manualSteps: {
    submitInvoice: [
      "Sign in to Paymode → Invoices → Upload (requires Premium Invoice Delivery and a customer that accepts invoices through Paymode).",
      "Attach the VendorSync PDF, confirm the customer and amount, and record the Paymode reference here.",
    ],
  },
});

export const appFolio = definePortal({
  key: "APPFOLIO",
  name: "AppFolio Vendor Portal",
  owner: "AppFolio",
  website: "https://www.appfolio.com/help/vendor-portal",
  defaultLoginUrl: "https://www.appfolio.com/help/vendor-portal",
  mode: "MANUAL",
  handles: ["INVOICES", "COMPLIANCE", "PAYMENTS"],
  summary: "Free vendor website activated by the management company: work orders across all your AppFolio customers, invoice upload or entry against a work order, compliance document upload with expiry reminders, payment preference, and payment status.",
  integrationNotes:
    "AppFolio's Stack API is partner-gated (application, security review, contract, fee) and the Database API is for AppFolio customers, so there is no vendor API. Two routes: the Vendor Portal (manual), or the customer's Smart Bill Entry inbox – a unique email address the management company can share; put it on the customer or portal account as the intake email and VendorSync will email the PDF there automatically. AppFolio's terms prohibit automated scraping, so browser automation is not used.",
  manualSteps: {
    submitInvoice: [
      "Open the work order in the AppFolio Vendor Portal (link in the activation email).",
      "Upload the VendorSync PDF or enter the invoice details, then submit.",
      "Record the work-order number on the submission.",
    ],
    updateCompliance: ["In the Vendor Portal, upload the renewed COI/W-9 under Documents; AppFolio emails expiry reminders."],
  },
});

export const complianceDepot = definePortal({
  key: "COMPLIANCE_DEPOT",
  name: "RealPage Vendor Credentialing (Compliance Depot)",
  owner: "RealPage",
  website: "https://www.realpage.com/vendor-management/",
  defaultLoginUrl: "https://vendorcredentialing.realpage.com/",
  mode: "MANUAL",
  handles: ["COMPLIANCE"],
  summary: "RealPage vendor credentialing: COI and endorsement tracking, license verification, W-9, background/OFAC checks. Vendors pay per management company (roughly $85–$109/year); the Credential Key shares your pre-qualification across RealPage clients.",
  integrationNotes:
    "Web portal only (Submit Documents → Submit/Resubmit); no API or mobile app. VendorSync mirrors requirements, tracks expirations, and gives you the upload checklist.",
  manualSteps: {
    updateCompliance: [
      "Sign in → Submit Documents → Submit/Resubmit for the flagged requirement.",
      "Check each client's requirement list; some require their own certificate-holder wording.",
    ],
  },
});

export const entrata = definePortal({
  key: "ENTRATA",
  name: "Entrata VendorAccess",
  owner: "Entrata",
  website: "https://entrata.com/products/procure-to-pay",
  defaultLoginUrl: "",
  mode: "MANUAL",
  handles: ["INVOICES", "PAYMENTS", "COMPLIANCE"],
  summary: "Vendor portal for Entrata-based management companies: receive POs, submit invoices, manage Bill Pay preferences (virtual card, ACH, check). Compliance is handled through NetVendor.",
  integrationNotes:
    "Entrata's API is partner-gated and credentials are issued by the management company, so vendors cannot integrate directly. Use the VendorAccess login your customer's vendor-enablement team sent you (set it as the login URL).",
  manualSteps: {
    submitInvoice: ["Sign in to VendorAccess → Invoices → Add Invoice against the PO, attach the PDF, submit and record the reference."],
  },
});

export const buildium = definePortal({
  key: "BUILDIUM",
  name: "Buildium",
  owner: "RealPage",
  website: "https://www.buildium.com",
  defaultLoginUrl: "",
  mode: "EMAIL",
  handles: ["INVOICES", "PAYMENTS"],
  summary: "Buildium property management software. There is no vendor portal: the management company enters bills (or emails them to its AI Bill Scan inbox) and pays by ePay ACH or check.",
  integrationNotes:
    "Buildium's open API is enabled by the management company on its own account, so vendors send invoices by email. Put the customer's AP or Bill Scan inbox address on the customer record and VendorSync emails the PDF.",
  manualSteps: { submitInvoice: ["Submit from VendorSync to email the PDF to the customer's AP / Bill Scan address."] },
});

export const vendorShield = definePortal({
  key: "VENDORSHIELD",
  name: "VendorShield",
  owner: "Yardi",
  website: "https://www.yardi.com/product/vendorshield/",
  defaultLoginUrl: "https://www.vendorcafe.com/",
  mode: "MANUAL",
  handles: ["COMPLIANCE"],
  summary: "Yardi's vendor credentialing service (insurance, licenses, background, watch-list checks). Non-compliance can freeze POs and payments. Annual fee set per management company (about $90–$110).",
  integrationNotes: "Everything happens inside VendorCafe; this connector exists so you can track VendorShield-only relationships separately.",
  manualSteps: { updateCompliance: ["Sign in to VendorCafe → VendorShield → upload renewed documents."] },
});

export const otherPortal = definePortal({
  key: "OTHER",
  name: "Other portal",
  owner: "—",
  website: "",
  defaultLoginUrl: "",
  mode: "MANUAL",
  handles: ["INVOICES", "COMPLIANCE", "PAYMENTS"],
  summary: "Any portal not listed. VendorSync stores the login, tracks status, and reminds you.",
  integrationNotes: "Manual tracking only.",
  manualSteps: {
    submitInvoice: ["Sign in to the portal, upload the VendorSync PDF, and record the confirmation here."],
    updateCompliance: ["Sign in and upload the renewed document."],
  },
});

export const PORTAL_CONNECTORS: PortalConnector[] = [
  opsTechnology,
  vendorCafe,
  vendorShield,
  netVendor,
  complianceDepot,
  paymode,
  appFolio,
  entrata,
  buildium,
  otherPortal,
];
