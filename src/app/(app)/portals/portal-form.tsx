import type { PortalAccount } from "@prisma/client";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { CONNECTORS, MODE_LABEL } from "@/connectors/registry";

export function PortalForm({ account, action, defaultProvider }: { account?: PortalAccount; action: (fd: FormData) => Promise<void>; defaultProvider?: string }) {
  const a = account;
  return (
    <form action={action} className="card p-5 grid gap-4 sm:grid-cols-2">
      {a && <input type="hidden" name="id" value={a.id} />}
      <Field label="Portal" className="sm:col-span-2">
        <select name="provider" className="input" defaultValue={a?.provider ?? defaultProvider ?? "OPS_TECHNOLOGY"}>
          {CONNECTORS.filter((c) => c.key !== "EMAIL").map((c) => <option key={c.key} value={c.key}>{c.name} — {MODE_LABEL[c.mode]}</option>)}
        </select>
      </Field>
      <Field label="Label" hint="How you refer to it, e.g. “VendorCafe (all Yardi clients)”." className="sm:col-span-2"><input name="label" className="input" required defaultValue={a?.label ?? ""} /></Field>
      <Field label="Login URL" hint="Leave blank to use the portal's default."><input name="loginUrl" className="input" defaultValue={a?.loginUrl ?? ""} placeholder="https://" /></Field>
      <Field label="Username / email"><input name="username" className="input" defaultValue={a?.username ?? ""} autoComplete="off" /></Field>
      <Field label={a ? "New password (leave blank to keep)" : "Password"} hint="Encrypted at rest with AES-256-GCM. Only used for opt-in browser automation."><input name="password" type="password" className="input" autoComplete="new-password" /></Field>
      <Field label="Invoice intake email" hint="If this portal / customer accepts emailed invoices (e.g. AppFolio Smart Bill Entry), VendorSync will send there."><input name="intakeEmail" type="email" className="input" defaultValue={a?.intakeEmail ?? ""} /></Field>
      <Field label="Notes" className="sm:col-span-2"><textarea name="notes" className="input" rows={3} defaultValue={a?.notes ?? ""} placeholder="Annual fee due date, support phone, security questions hint (not the answers!)…" /></Field>
      {a?.encryptedSecret && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="clearPassword" /> Remove stored password</label>}
      <div className="sm:col-span-2"><SubmitButton>{a ? "Save changes" : "Add portal"}</SubmitButton></div>
    </form>
  );
}
