import clsx from "clsx";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

const FIELD_CLASS =
  "w-full rounded-md border border-border-strong bg-surface-sunken px-3 py-2 font-sans text-sm text-ink " +
  "placeholder:text-ink-faint focus-visible:outline-none focus-visible:shadow-glow-accent " +
  "disabled:pointer-events-none disabled:opacity-40 transition duration-fast ease-out";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={clsx(FIELD_CLASS, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={clsx(FIELD_CLASS, "min-h-24 resize-y", className)} {...props} />;
});
