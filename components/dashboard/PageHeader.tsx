import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/shadcn/button";

/**
 * Page-level action bar.
 *
 * Sits at the very top of the content area, above everything else, because
 * that space is reserved for what you can DO on this page. The shell's own
 * header above it carries only shell concerns (sidebar trigger, theme), so the
 * two never compete.
 */
export function PageHeader({
  title,
  description,
  primaryAction,
  children,
}: {
  title: string;
  description?: string;
  primaryAction?: { label: string; href: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-s-4">
      <div>
        <h1 className="font-serif text-xl leading-tight text-ink">{title}</h1>
        {description && (
          <p className="mt-s-1 font-sans text-sm text-ink-muted">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-s-2">
        {children}
        {primaryAction && (
          <Button asChild size="sm" className="gap-1.5">
            <Link href={primaryAction.href}>
              <Plus className="size-3.5" />
              {primaryAction.label}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
