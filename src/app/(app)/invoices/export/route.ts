import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invoiceBatchCsv } from "@/lib/invoice-export";

const STATUS_SETS: Record<string, string[] | undefined> = {
  open: ["DRAFT", "READY", "SUBMITTED", "APPROVED", "REJECTED"], unsent: ["DRAFT", "READY"], submitted: ["SUBMITTED", "APPROVED"], rejected: ["REJECTED"], paid: ["PAID"], all: undefined,
};

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const statuses = STATUS_SETS[url.searchParams.get("status") ?? "unsent"];
  const customer = url.searchParams.get("customer");
  const rows = await prisma.invoice.findMany({
    where: { vendorId: user.vendorId, ...(statuses ? { status: { in: statuses } } : {}), ...(customer ? { customerId: customer } : {}) },
    include: { customer: true, property: true },
    orderBy: { issueDate: "asc" },
  });
  return new NextResponse(invoiceBatchCsv(rows), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="vendorsync-invoices-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
