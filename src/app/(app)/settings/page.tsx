import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Field, PageHeader, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { smtpConfigured } from "@/connectors/mailer";
import { browserAutomationEnabled } from "@/connectors/browser";
import { addTeamMember, removeTeamMember, updateVendorProfile } from "./actions";

export default async function SettingsPage() {
  const user = await requireUser();
  const [vendor, team] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: user.vendorId } }),
    prisma.user.findMany({ where: { vendorId: user.vendorId }, orderBy: { createdAt: "asc" } }),
  ]);
  const v = vendor;
  return (
    <>
      <PageHeader title="Settings" subtitle="Company profile (printed on invoices), team, and system status." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Company profile">
            <form action={updateVendorProfile} className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name"><input name="name" className="input" defaultValue={v.name} required /></Field>
              <Field label="Legal name (as on W-9)"><input name="legalName" className="input" defaultValue={v.legalName ?? ""} /></Field>
              <Field label="EIN"><input name="ein" className="input" defaultValue={v.ein ?? ""} placeholder="12-3456789" /></Field>
              <Field label="Phone"><input name="phone" className="input" defaultValue={v.phone ?? ""} /></Field>
              <Field label="Billing email"><input name="email" type="email" className="input" defaultValue={v.email ?? ""} /></Field>
              <Field label="Website"><input name="website" className="input" defaultValue={v.website ?? ""} /></Field>
              <Field label="Street address" className="sm:col-span-2"><input name="address" className="input" defaultValue={v.address ?? ""} /></Field>
              <Field label="City"><input name="city" className="input" defaultValue={v.city ?? ""} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="State"><input name="state" className="input" defaultValue={v.state ?? ""} /></Field>
                <Field label="ZIP"><input name="zip" className="input" defaultValue={v.zip ?? ""} /></Field>
              </div>
              <Field label="Remit-to / payment instructions (printed on invoices)" className="sm:col-span-2">
                <textarea name="remitTo" className="input" rows={3} defaultValue={v.remitTo ?? ""} placeholder={"Make checks payable to …\nACH: see enclosed ACH form"} />
              </Field>
              <div className="sm:col-span-2"><SubmitButton>Save profile</SubmitButton></div>
            </form>
          </Card>

          <Card title="Team">
            <table className="table mb-4">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
              <tbody>
                {team.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td><td>{t.email}</td><td><Badge tone={t.role === "OWNER" ? "indigo" : "gray"}>{t.role}</Badge></td>
                    <td className="text-right">{t.role !== "OWNER" && t.id !== user.id && user.role !== "STAFF" && (
                      <ConfirmForm action={removeTeamMember} message={`Remove ${t.name}?`} inputs={{ id: t.id }}>Remove</ConfirmForm>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {user.role !== "STAFF" && (
              <form action={addTeamMember} className="grid gap-3 sm:grid-cols-4 items-end">
                <Field label="Name"><input name="name" className="input" required /></Field>
                <Field label="Email"><input name="email" type="email" className="input" required /></Field>
                <Field label="Temporary password"><input name="password" type="text" className="input" required minLength={8} /></Field>
                <div className="flex gap-2">
                  <select name="role" className="input"><option value="STAFF">Staff</option><option value="ADMIN">Admin</option></select>
                  <SubmitButton className="btn-secondary">Add</SubmitButton>
                </div>
              </form>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="System status">
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span>Outgoing email (SMTP)</span><Badge tone={smtpConfigured() ? "green" : "yellow"}>{smtpConfigured() ? "Configured" : "Dry run"}</Badge></li>
              <li className="flex justify-between"><span>Browser automation</span><Badge tone={browserAutomationEnabled() ? "green" : "gray"}>{browserAutomationEnabled() ? "Enabled" : "Off"}</Badge></li>
              <li className="flex justify-between"><span>Credential encryption</span><Badge tone={process.env.VENDORSYNC_ENCRYPTION_KEY?.length === 64 ? "green" : "red"}>{process.env.VENDORSYNC_ENCRYPTION_KEY?.length === 64 ? "AES-256-GCM" : "Key missing"}</Badge></li>
            </ul>
            <p className="mt-4 text-xs text-gray-500">Configure these in <code>.env</code>. See README for details.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
