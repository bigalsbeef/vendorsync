import type { ConnectorContext, ConnectorResult, PortalConnector } from "../types";
import { checkLoginPageReachable } from "../browser";

/**
 * Builds a MANUAL or BROWSER connector from metadata. Submitting an invoice
 * through one of these records a PENDING submission and hands the user the
 * checklist; the user confirms when the portal accepts it.
 */
export function definePortal(
  def: Omit<PortalConnector, "testConnection" | "submitInvoice" | "syncCompliance" | "pullPayments"> & {
    testConnection?: PortalConnector["testConnection"];
    submitInvoice?: PortalConnector["submitInvoice"];
    syncCompliance?: PortalConnector["syncCompliance"];
    pullPayments?: PortalConnector["pullPayments"];
  }
): PortalConnector {
  return {
    async testConnection(ctx: ConnectorContext): Promise<ConnectorResult> {
      const url = ctx.account.loginUrl || def.defaultLoginUrl;
      if (!url) return { ok: false, message: "No login URL configured." };
      if (def.mode === "BROWSER") return checkLoginPageReachable(ctx, url);
      try {
        const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15_000) });
        ctx.log(`GET ${url} → ${res.status}`);
        return { ok: res.ok, message: res.ok ? `Portal reachable (${res.status}). Credentials stored; sign-in is manual.` : `Portal returned HTTP ${res.status}.` };
      } catch (e) {
        return { ok: false, message: `Could not reach ${url}: ${(e as Error).message}` };
      }
    },
    async submitInvoice(ctx, p) {
      const url = ctx.account.loginUrl || def.defaultLoginUrl;
      ctx.log(`Manual submission required for ${def.name}`);
      return {
        ok: true,
        status: "PENDING",
        message: `Invoice ${p.invoice.invoiceNumber} is queued. Open ${def.name} (${url}) and follow the checklist, then mark the submission as sent.`,
      };
    },
    ...def,
  };
}
