import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "../customer-form";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  const user = await requireUser();
  const portals = await prisma.portalAccount.findMany({ where: { vendorId: user.vendorId }, orderBy: { label: "asc" } });
  return (
    <>
      <PageHeader title="Add customer" subtitle="A property management company and what they need from you." />
      <div className="max-w-3xl"><CustomerForm portals={portals} action={createCustomer} /></div>
    </>
  );
}
