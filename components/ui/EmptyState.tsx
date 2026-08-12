import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";

/**
 * Generic cross-cutting empty state (Task 13). Sits in chrome, not on a
 * `.surface-reading` panel -- plain centered `text-ink-muted` block with an
 * optional CTA. Reused wherever a page hits a zero-items condition (empty
 * workspaces list, no discover search matches, no MCP tokens left).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Icon icon={icon} size="md" className="text-ink-faint" />
      <p className="font-sans text-sm text-ink-muted">{title}</p>
      {description && <p className="max-w-sm font-sans text-xs text-ink-faint">{description}</p>}
      {action && (
        <Link href={action.href} className={buttonClassName("primary", "sm", "mt-1")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
