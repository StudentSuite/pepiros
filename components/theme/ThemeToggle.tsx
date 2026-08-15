"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

/**
 * Three-way theme control.
 *
 * Built as a segmented radiogroup rather than a dropdown: with exactly three
 * mutually exclusive options it costs one click instead of two, all states stay
 * visible, and it needs no portal or outside-click handling in the header.
 *
 * The mounted guard is required, not defensive. On the server there is no
 * resolved theme, so rendering a "selected" segment during SSR would guarantee
 * a hydration mismatch the moment the client resolves `system` or reads
 * localStorage. Until mount, every segment renders unselected -- the layout is
 * identical, so nothing shifts when the real state lands.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "glass inline-flex items-center gap-s-1 rounded-full p-[3px]",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const selected = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full",
              "transition-colors duration-fast ease-out",
              selected
                ? "bg-accent text-white shadow-e-1"
                : "text-ink-faint hover:text-ink hover:bg-subtle",
            )}
          >
            <Icon icon={option.icon} size="xs" />
          </button>
        );
      })}
    </div>
  );
}
