import { Skeleton } from "@/components/ui/Skeleton";
import { Band } from "@/components/chrome/Band";

/**
 * Loading fallback for the four AuthShell pages (login, signup,
 * reset-password, reset-password/confirm) -- mirrors AuthShell.tsx's real
 * split layout (form column max ~400px, full-height shader Band to the
 * right at lg, dropping below it) instead of falling through to the root
 * loading.tsx's prose skeleton, which has the wrong silhouette for a form.
 *
 * The Band half is real (not a skeleton placeholder): it's decorative
 * chrome with no data to be "loading," and rendering the actual Band here
 * means zero layout shift when AuthShell itself mounts, since both are the
 * exact same markup.
 */
export function AuthCardSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div
      className="bg-surface lg:grid lg:min-h-[calc(100vh-var(--topbar))] lg:grid-cols-2"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="mx-auto flex min-h-[var(--centered-page-min-h)] w-full max-w-[400px] flex-col justify-center p-s-5 lg:min-h-0 lg:max-w-none lg:px-s-8">
        <Skeleton className="h-7 w-28" />

        <Skeleton className="mt-s-5 h-7 w-2/3" />
        <Skeleton className="mt-s-2 h-4 w-4/5" />

        <div className="mt-s-5 flex flex-col gap-s-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="mt-s-1 h-10 w-full" />
        </div>
      </div>

      <Band as="div" variant="dark" className="hidden lg:flex lg:items-center lg:justify-center lg:p-s-8">
        <p className="max-w-xs font-sans text-3xl font-semibold leading-[1.15] text-brand-ink-reversed">
          Be the source.
        </p>
      </Band>
    </div>
  );
}
