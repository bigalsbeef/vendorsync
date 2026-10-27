export type DocumentTypeKey =
  | "COI_GL"
  | "COI_AUTO"
  | "COI_WC"
  | "COI_UMBRELLA"
  | "W9"
  | "BUSINESS_LICENSE"
  | "CONTRACTOR_LICENSE"
  | "BACKGROUND_CHECK"
  | "MSA"
  | "ACH_FORM"
  | "OTHER";

export const DOCUMENT_TYPES: Record<
  DocumentTypeKey,
  { label: string; short: string; insurance: boolean; expires: boolean; description: string }
> = {
  COI_GL: {
    label: "Certificate of Insurance – General Liability",
    short: "GL COI",
    insurance: true,
    expires: true,
    description: "Most property managers require $1M per occurrence / $2M aggregate and the customer listed as additional insured.",
  },
  COI_AUTO: {
    label: "Certificate of Insurance – Commercial Auto",
    short: "Auto COI",
    insurance: true,
    expires: true,
    description: "Required for any vendor driving vehicles onto properties.",
  },
  COI_WC: {
    label: "Certificate of Insurance – Workers' Compensation",
    short: "WC COI",
    insurance: true,
    expires: true,
    description: "Statutory limits; some customers accept an exemption letter for owner-only companies.",
  },
  COI_UMBRELLA: {
    label: "Certificate of Insurance – Umbrella / Excess",
    short: "Umbrella COI",
    insurance: true,
    expires: true,
    description: "Typically $1M–$5M, required by larger management companies.",
  },
  W9: {
    label: "IRS Form W-9",
    short: "W-9",
    insurance: false,
    expires: false,
    description: "Taxpayer ID certification. Re-send when legal name, EIN, or address changes.",
  },
  BUSINESS_LICENSE: {
    label: "Business License",
    short: "Business License",
    insurance: false,
    expires: true,
    description: "City/county business license.",
  },
  CONTRACTOR_LICENSE: {
    label: "Contractor / Trade License",
    short: "Trade License",
    insurance: false,
    expires: true,
    description: "State contractor or trade-specific license where applicable.",
  },
  BACKGROUND_CHECK: {
    label: "Background Check Attestation",
    short: "Background Check",
    insurance: false,
    expires: true,
    description: "Attestation that on-site staff have passed background checks.",
  },
  MSA: {
    label: "Master Service Agreement / Vendor Agreement",
    short: "Vendor Agreement",
    insurance: false,
    expires: false,
    description: "Signed vendor agreement with the management company.",
  },
  ACH_FORM: {
    label: "ACH / Direct Deposit Authorization",
    short: "ACH Form",
    insurance: false,
    expires: false,
    description: "Banking details for electronic payment.",
  },
  OTHER: {
    label: "Other",
    short: "Other",
    insurance: false,
    expires: true,
    description: "Anything else a customer asks for.",
  },
};

export const DOCUMENT_TYPE_KEYS = Object.keys(DOCUMENT_TYPES) as DocumentTypeKey[];

export function documentTypeLabel(key: string) {
  return DOCUMENT_TYPES[key as DocumentTypeKey]?.label ?? key;
}
export function documentTypeShort(key: string) {
  return DOCUMENT_TYPES[key as DocumentTypeKey]?.short ?? key;
}
