import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { CustomerForm } from "../../customer-form";
import { deleteCustomer, updateCustomer } from "../../actions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [customer, portals] = await Promise.all([
    prisma.customer.findFirst({ where: { id, vendorId: user.vendorId } }),
    prisma.portalAccount.findMany({ where: { vendorId: user.vendorId }, orderBy: { label: "asc" } }),
  ]);
  if (!customer) notFound();
  return (
    <>
      <PageHeader title={`Edit ${customer.name}`} actions={<ConfirmForm action={deleteCustomer} message={`Delete ${customer.name} and all of its invoices, properties and requirements? This cannot be undone.`} inputs={{ id }}>Delete customer</ConfirmForm>} />
      <div className="max-w-3xl"><CustomerForm customer={customer} portals={portals} action={updateCustomer} /></div>
    </>
  );
}
