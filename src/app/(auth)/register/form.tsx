"use client";
import { useActionState } from "react";
import { register } from "../actions";
import { Field, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function RegisterForm() {
  const [state, action] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="red">{state.error}</Alert>}
      <Field label="Company name"><input name="company" className="input" required /></Field>
      <Field label="Your name"><input name="name" className="input" required /></Field>
      <Field label="Email"><input name="email" type="email" className="input" required autoComplete="email" /></Field>
      <Field label="Password" hint="At least 8 characters"><input name="password" type="password" className="input" required minLength={8} autoComplete="new-password" /></Field>
      <SubmitButton className="btn-primary w-full" pendingText="Creating…">Create account</SubmitButton>
    </form>
  );
}
