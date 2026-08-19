"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";

/**
 * Issue #129: no password field anywhere had a visibility toggle. A plain
 * icon button sized to sit inside the field rather than IconButton's 44px
 * standalone target -- this is a compact in-field adornment, not a primary
 * tap target competing for touch real estate.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function PasswordInput({ className, ...props }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input ref={ref} type={visible ? "text" : "password"} className={`pr-10 ${className ?? ""}`} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-ink-faint transition-colors duration-fast ease-out hover:text-ink"
      >
        {visible ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
      </button>
    </div>
  );
});
