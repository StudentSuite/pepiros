import { useId, type ReactElement, cloneElement } from "react";
import clsx from "clsx";

/**
 * Label + hint/error wrapper for Input/Textarea. Owns the id/aria-describedby
 * wiring so a field and its error are actually associated for screen readers
 * -- pass the field as `children`, this clones in the id and aria attrs.
 */
export function FormField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-sans text-xs font-medium text-ink-muted">
        {label}
        {required && <span className="text-unsupported"> *</span>}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": errorId ?? hintId,
        "aria-invalid": Boolean(error),
      })}
      {error ? (
        <p id={errorId} className="font-sans text-xs text-unsupported">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={clsx("font-sans text-xs text-ink-faint")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
