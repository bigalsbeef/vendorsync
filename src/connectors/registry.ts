import { emailConnector } from "./providers/email";
import { PORTAL_CONNECTORS } from "./providers/portals";
import type { PortalConnector } from "./types";

export const CONNECTORS: PortalConnector[] = [...PORTAL_CONNECTORS, emailConnector];

export function getConnector(key: string): PortalConnector {
  return CONNECTORS.find((c) => c.key === key) ?? CONNECTORS.find((c) => c.key === "OTHER")!;
}

export const MODE_LABEL: Record<PortalConnector["mode"], string> = {
  API: "API (automated)",
  EMAIL: "Email intake (automated send)",
  BROWSER: "Browser automation (opt-in) / manual",
  MANUAL: "Manual with checklist",
};
