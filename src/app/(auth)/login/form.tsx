"use client";
import { useActionState } from "react";
import { login } from "../actions";
import { Field, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="red">{state.error}</Alert>}
      <Field label="Email"><input name="email" type="email" className="input" required autoComplete="email" /></Field>
      <Field label="Password"><input name="password" type="password" className="input" required autoComplete="current-password" /></Field>
      <SubmitButton className="btn-primary w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
