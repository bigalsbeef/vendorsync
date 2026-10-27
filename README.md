# VendorSync

One login for every property-management portal a vendor has to keep up with. VendorSync is the
vendor-side hub: customers, the portal each one uses, the compliance documents each one requires,
invoices and where they are, and payments.

Built for vendors (junk removal, cleaning, landscaping, maintenance) who get pushed into
Ops Technology, VendorCafe, NetVendor, Paymode, AppFolio, Compliance Depot, Entrata and more.

## What it does

- **Dashboard**: compliance health per customer, documents expiring, open receivables, unsent invoices, portal status, activity feed.
- **Customers**: each management company, its portal, vendor number, AP email, payment terms, properties, and a requirements matrix (GL/Auto/WC/Umbrella COI, W-9, licenses, background checks…) with min coverage and additional-insured flags. VendorSync compares your master documents against each requirement and tells you the single next action.
- **Portals**: one record per outside system with encrypted credentials (AES-256-GCM), intake email, status, connection log, per-portal checklist and deep link.
- **Compliance documents**: upload master copies once, track expirations, see which customers need each.
- **Invoices**: line items or flat amount, PO / work-order numbers, generated PDF (or attach your own), one-click submit that routes by the customer's portal: email send when an intake address exists, otherwise a checklist with confirmation-number capture. CSV export for VendorCafe / Ops batch templates.
- **Payments**: record remittances (ACH, Paymode, check, virtual card) against invoices; invoices flip to Paid automatically.
- **Team**: owner/admin/staff users per vendor company.

See `docs/INTEGRATIONS.md` for what each portal really allows and how the connector modes map to it.

## Run it

```bash
npm install
cp .env.example .env            # set VENDORSYNC_ENCRYPTION_KEY (see comment in file)
npx prisma db push              # creates prisma/dev.db (SQLite)
npm run db:seed                 # optional demo data
npm run dev                     # http://localhost:3000
```

Demo login after seeding: `demo@vendorsync.local` / `vendorsync`.

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run db:reset`.

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file for dev. For production set `provider = "postgresql"` in `prisma/schema.prisma` and point this at Postgres. |
| `VENDORSYNC_ENCRYPTION_KEY` | 32-byte hex key for portal passwords at rest. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Outgoing mail for emailed invoices. Unset = dry run (logged, not sent). |
| `STORAGE_DIR` | Where uploads live (`./storage`). Swap `src/lib/storage.ts` for S3. |
| `VENDORSYNC_ENABLE_BROWSER_AUTOMATION` | `true` to allow Playwright-driven connectors. Off by default. |

## Architecture

```
src/
  app/
    (auth)/        login, register, logout (cookie sessions, bcrypt)
    (app)/         dashboard, customers, portals, documents, invoices, payments, settings
                   each folder: page.tsx + actions.ts (server actions) [+ route.ts for files]
  components/      ui primitives, submit/confirm buttons
  lib/
    db.ts          Prisma client
    auth.ts        sessions
    crypto.ts      AES-256-GCM for portal secrets
    compliance.ts  requirement vs document assessment (the "what do I do next" logic)
    invoice-pdf.ts PDF rendering (pdfkit)
    invoice-export.ts CSV batch export
    storage.ts     local file storage
  connectors/
    types.ts       PortalConnector interface, IntegrationMode (API | EMAIL | BROWSER | MANUAL)
    registry.ts    lookup by provider key
    run.ts         runs jobs + invoice submissions, records SyncJob / InvoiceSubmission / Activity
    mailer.ts      SMTP or dry-run
    browser.ts     opt-in Playwright helpers
    providers/     one definition per portal + generic email connector
prisma/schema.prisma   data model (Vendor, User, PortalAccount, Customer, Property,
                       ComplianceDocument, ComplianceRequirement, Invoice, InvoiceLineItem,
                       InvoiceSubmission, Payment, SyncJob, Activity)
```

Adding a portal: add a `definePortal({...})` entry in `src/connectors/providers/portals.ts`. Adding real
automation for one: implement `submitInvoice` / `syncCompliance` / `pullPayments` on that entry.

## Stack

Next.js 15 (App Router, server actions), TypeScript, Tailwind v4, Prisma 6 (SQLite dev / Postgres prod),
bcryptjs, zod, pdfkit, nodemailer, optional Playwright.

## Deploying

Any Node host works (Vercel, Fly, Railway, a VPS). Use Postgres, set a real encryption key and SMTP,
mount persistent storage or switch to S3, and put it behind HTTPS so session cookies are `secure`.
