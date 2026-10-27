import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const doc = await prisma.complianceDocument.findFirst({ where: { id, vendorId: user.vendorId } });
  if (!doc?.storageKey) return new NextResponse("Not found", { status: 404 });
  const buf = await readStoredFile(doc.storageKey);
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": doc.mimeType ?? "application/octet-stream", "Content-Disposition": `inline; filename="${doc.fileName ?? "document"}"` },
  });
}
