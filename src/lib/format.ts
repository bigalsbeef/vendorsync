import { format, formatDistanceToNowStrict, differenceInCalendarDays } from "date-fns";

export function money(cents: number | null | undefined) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function dateShort(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy");
}

export function relative(d: Date | string | null | undefined) {
  if (!d) return "—";
  return formatDistanceToNowStrict(new Date(d), { addSuffix: true });
}

export function daysUntil(d: Date | string | null | undefined) {
  if (!d) return null;
  return differenceInCalendarDays(new Date(d), new Date());
}

export function toDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  return format(new Date(d), "yyyy-MM-dd");
}

export function parseCents(input: string | null | undefined): number {
  if (!input) return 0;
  const n = Number(String(input).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
