"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  /** Disabled for reasons of its own (e.g. the action is not available yet). */
  disabled?: boolean;
};

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary mt-2 w-full",
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending ? "true" : undefined}
    >
      {pending ? (
        <>
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
