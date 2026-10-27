import type { ComplianceDocument, ComplianceRequirement, Customer } from "@prisma/client";
import { daysUntil } from "./format";

export type DocHealth = "VALID" | "EXPIRING" | "EXPIRED" | "MISSING";

export const EXPIRING_WINDOW_DAYS = 30;

/** Health of a single document on file. */
export function documentHealth(doc: Pick<ComplianceDocument, "expiresAt"> | null | undefined): DocHealth {
  if (!doc) return "MISSING";
  if (!doc.expiresAt) return "VALID";
  const days = daysUntil(doc.expiresAt)!;
  if (days < 0) return "EXPIRED";
  if (days <= EXPIRING_WINDOW_DAYS) return "EXPIRING";
  return "VALID";
}

/** Pick the best document of a given type: latest expiration, then newest upload. */
export function bestDocument(docs: ComplianceDocument[], documentType: string) {
  return docs
    .filter((d) => d.documentType === documentType)
    .sort((a, b) => {
      const ae = a.expiresAt ? a.expiresAt.getTime() : Infinity;
      const be = b.expiresAt ? b.expiresAt.getTime() : Infinity;
      if (ae !== be) return be - ae;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })[0];
}

export type RequirementAssessment = {
  requirement: ComplianceRequirement;
  document?: ComplianceDocument;
  health: DocHealth;
  coverageOk: boolean;
  /** Whether what the customer has on file is current. */
  customerStatus: ComplianceRequirement["status"];
  /** The single thing the vendor should do next, or null if all good. */
  action: string | null;
};

export function assessRequirement(
  req: ComplianceRequirement,
  docs: ComplianceDocument[]
): RequirementAssessment {
  const document = bestDocument(docs, req.documentType);
  const health = documentHealth(document);
  const coverageOk =
    !req.minCoverageCents || !document?.coverageCents ? true : document.coverageCents >= req.minCoverageCents;

  let action: string | null = null;
  if (health === "MISSING") action = "Upload this document";
  else if (health === "EXPIRED") action = "Document expired – get a renewed copy from your agent and upload it";
  else if (!coverageOk) action = "Coverage on file is below the customer's minimum";
  else if (req.status === "NOT_SUBMITTED") action = "Submit to customer";
  else if (req.status === "REJECTED") action = `Rejected${req.rejectionReason ? `: ${req.rejectionReason}` : ""} – fix and resubmit`;
  else if (req.status === "EXPIRED") action = "Customer shows this as expired – resubmit current document";
  else if (req.submittedDocumentId && document && req.submittedDocumentId !== document.id)
    action = "A newer document is on file – resubmit to customer";
  else if (health === "EXPIRING") action = `Expires in ${daysUntil(document!.expiresAt)} days – request renewal`;

  return { requirement: req, document, health, coverageOk, customerStatus: req.status, action };
}

export type CustomerCompliance = {
  customer: Customer;
  assessments: RequirementAssessment[];
  total: number;
  satisfied: number;
  score: number; // 0..100
  level: "GOOD" | "AT_RISK" | "BLOCKED";
};

export function assessCustomer(
  customer: Customer & { requirements: ComplianceRequirement[] },
  docs: ComplianceDocument[]
): CustomerCompliance {
  const assessments = customer.requirements.map((r) => assessRequirement(r, docs));
  const total = assessments.length;
  const satisfied = assessments.filter((a) => a.action === null).length;
  const score = total === 0 ? 100 : Math.round((satisfied / total) * 100);
  const hardFail = assessments.some(
    (a) => a.health === "MISSING" || a.health === "EXPIRED" || a.customerStatus === "REJECTED" || !a.coverageOk
  );
  const level = hardFail ? "BLOCKED" : score === 100 ? "GOOD" : "AT_RISK";
  return { customer, assessments, total, satisfied, score, level };
}
