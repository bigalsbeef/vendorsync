import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PortalForm } from "../portal-form";
import { createPortalAccount } from "../actions";

export default async function NewPortalPage({ searchParams }: { searchParams: Promise<{ provider?: string }> }) {
  await requireUser();
  const { provider } = await searchParams;
  return (
    <>
      <PageHeader title="Add portal" subtitle="Store the login once; VendorSync will track what each customer on it needs." />
      <div className="max-w-3xl"><PortalForm action={createPortalAccount} defaultProvider={provider} /></div>
    </>
  );
}
