import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

/**
 * Clickable preview card: an image/illustration slot, a kicker, a one-line
 * pitch, and an arrow-link affordance, the whole thing wrapped in a single
 * Next `<Link>`. Pass `imageSrc` for a real screenshot, or `children` for an
 * illustrative placeholder (there's no screenshot asset yet -- see the home
 * page's canvas-preview usage) -- `imageSrc` wins if both are given. The
 * image alt is intentionally empty: the kicker + pitch beside it are the
 * text alternative, so the thumbnail is decorative.
 */
export function PreviewCard({
  href,
  kicker,
  pitch,
  imageSrc,
  children,
}: {
  href: string;
  kicker: string;
  pitch: string;
  imageSrc?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-s-3 rounded-lg border border-border bg-surface-raised p-s-4 shadow-e-1 transition duration-base ease-out hover:border-accent hover:shadow-e-2"
    >
      <div className="overflow-hidden rounded border border-border bg-surface-sunken">
        <div className="aspect-[16/10] w-full transition-transform duration-base ease-out group-hover:scale-[1.03]">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- generic mock screenshot slot, arbitrary src, no next/image remotePatterns entry for it
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            children
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">{kicker}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="font-sans text-sm text-ink">{pitch}</p>
          <Icon
            icon={ArrowRight}
            size="sm"
            className="shrink-0 text-ink-faint transition-transform duration-base ease-out group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </div>
      </div>
    </Link>
  );
}
