"use client";
import { SubmitButton } from "./submit-button";

/** A form that asks for confirmation before running its server action. */
export function ConfirmForm({ action, message, children, className = "btn-danger btn-sm", inputs }: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: React.ReactNode;
  className?: string;
  inputs?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {inputs && Object.entries(inputs).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton className={className}>{children}</SubmitButton>
    </form>
  );
}
