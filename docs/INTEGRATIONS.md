# Portal integration reality (researched October 2026)

VendorSync has to be honest about one fact: **none of the portals that property-management
companies push vendors into offers a self-serve API to the vendor.** Every API program found
(RealPage Exchange, Yardi Standard Interfaces, AppFolio Stack, Entrata Developer, Buildium Open API,
Bottomline developer portal) is gated to the management company or to certified software partners.

So the connector layer works in four modes, chosen per portal:

| Mode | What VendorSync does | Used for |
|---|---|---|
| `EMAIL` | Generates the invoice PDF and emails it to an intake address the customer gave you | AppFolio Smart Bill Entry, Buildium AI Bill Scan, any AP inbox |
| `MANUAL` | Tracks the invoice/requirement, produces the PDF, shows a per-portal checklist and deep link, records your confirmation number | Ops Technology, VendorCafe, NetVendor, Compliance Depot, Paymode, Entrata, AppFolio Vendor Portal |
| `BROWSER` | Playwright drives your own login (opt-in via `VENDORSYNC_ENABLE_BROWSER_AUTOMATION=true`); scaffolding only, no portal scripts shipped | Future, where terms allow |
| `API` | Direct integration | None today; the interface exists for when a portal opens one |

Batch helpers: `/invoices/export` produces a CSV with the common columns so you can paste into the
VendorCafe CSV template or the Ops Technology Excel import.

## Per-portal notes

Sources are what the research pass could reach; several vendor sites block automated fetches, so
items marked *(secondhand)* came from third parties and should be re-verified.

### Ops Technology (RealPage)
- Purchasing/e-invoicing for RealPage clients; vendor fees per invoice or per usage.
- No vendor API. RealPage Exchange is partner-only and does not allow file upload via API *(secondhand)*.
- Vendor routes: web portal, **Excel invoice import**, Windows QuickBooks plugin (enabled per property by an Ops rep).
- https://www.realpage.com/vendor-services/ · https://equity.opstechnology.com/training

### VendorCafe / VendorShield / Bill Pay (Yardi)
- One VendorCafe login spans all your Yardi clients. Free to vendors; VendorShield credentialing fee set per client (~$90–110/yr); Bill Pay charges per payment.
- No vendor API. Routes: manual entry, **CSV template upload**, EDI via Yardi Marketplace (enterprise). Some clients route emailed invoices into PAYscan through a capture vendor.
- Terms of Use dated Sept 2023 at resources.yardi.com/legal; read before any automation.
- https://www.yardi.com/product/vendorcafe/

### NetVendor
- Compliance only (COI verification, W-9/TIN, OFAC, background). ~$49–149/yr per management company.
- No API or developer program. COI requests go to your insurance agent.
- https://www.netvendor.com/vendors

### Paymode (Bottomline; formerly Paymode-X, absorbed NexusConnect Dec 2024)
- Payment network plus, since March 2026, "Premium Invoice Delivery" (upload or ERP-to-Paymode). Basic free; Premium ~1.5% network fee.
- Developer portal (api.paymode.com) targets payers/ERPs. No payee self-serve API confirmed. Remittance by email, CSV, CTX.
- Operating Rules say services are accessed "only through the Website".
- https://www.bottomline.com/paymode-x

### AppFolio
- Free **Vendor Portal** (work orders across clients, invoice upload, compliance docs, payment status) activated by the PM.
- Stack API is partner-gated (application, security review, contract, fee). No vendor API.
- **Smart Bill Entry**: each PM account has an inbound email for PDF invoices *(secondhand)*; the PM has to give it to you.
- Terms prohibit scraping; browser automation is not used for AppFolio.
- https://www.appfolio.com/help/vendor-portal

### RealPage Vendor Credentialing (Compliance Depot)
- Compliance only; ~$85–109/yr per client; Credential Key shares pre-qualification across RealPage clients.
- Web portal only: https://vendorcredentialing.realpage.com/

### Entrata VendorAccess
- POs, invoice submission, Bill Pay preferences. Compliance via NetVendor.
- API is partner-gated and credentials are issued by the PM. No vendor API.
- https://entrata.com/products/procure-to-pay

### Buildium (RealPage)
- No vendor portal. PM enters bills or emails them to AI Bill Scan; pays by ePay ACH/check.
- Open API is enabled by the PM on a Premium plan. Vendors send by email.

## Competitive landscape
No product found that aggregates multiple PM vendor portals for the vendor. VendorPM (PM-side marketplace), Paymode ("one login across customers", Bottomline network only), and the single-PMS portals (VendorCafe, AppFolio Vendor Portal, RealPage Credential Key) each solve one slice. COI networks (TrustLayer, myCOI, Jones, Certificial) are PM-paid compliance tools.

## Where real automation can come from next
1. **Email intake everywhere it exists**: ask every AppFolio/Buildium/Yardi-PAYscan customer for their intake address. Already supported.
2. **Batch files**: match `src/lib/invoice-export.ts` column order to the VendorCafe and Ops templates once you download them from your accounts.
3. **Remittance import**: parse Paymode/Yardi Bill Pay remittance CSVs into `Payment` rows.
4. **Insurance agent loop**: generate COI request emails to your agent with each customer's certificate-holder wording.
5. **Browser automation** only after reading each portal's terms; RealPage/Yardi terms were not verifiable in this pass.
6. **Partner APIs**: if VendorSync grows into a multi-vendor product, apply to RealPage Exchange, Yardi, AppFolio Stack, and Entrata as a software partner; that is the only sanctioned API path.
