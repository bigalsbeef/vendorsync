import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const TONES = {
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  yellow: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  // invoices
  DRAFT: "gray", READY: "blue", SUBMITTED: "indigo", APPROVED: "green", REJECTED: "red", PAID: "green", VOID: "gray",
  // requirements / docs
  NOT_SUBMITTED: "yellow", EXPIRED: "red", VALID: "green", EXPIRING: "yellow", MISSING: "red",
  // portals
  CONNECTED: "green", NEEDS_ATTENTION: "yellow", DISCONNECTED: "gray",
  // submissions / jobs
  PENDING: "yellow", SENT: "indigo", ACCEPTED: "green", FAILED: "red", QUEUED: "gray", RUNNING: "blue", SUCCEEDED: "green", SKIPPED: "gray",
  // compliance level
  GOOD: "green", AT_RISK: "yellow", BLOCKED: "red",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "gray"}>{status.replace(/_/g, " ")}</Badge>;
}

export function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {body && <p className="mt-1 text-sm text-gray-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone = "gray", href }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; href?: string }) {
  const inner = (
    <div className="card p-4 h-full">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className={`mt-1 text-xs ${tone === "red" ? "text-red-600" : tone === "yellow" ? "text-amber-700" : tone === "green" ? "text-emerald-700" : "text-gray-500"}`}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner;
}

export function Alert({ tone = "blue", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-md px-4 py-3 text-sm ring-1 ring-inset ${TONES[tone]}`}>{children}</div>;
}
