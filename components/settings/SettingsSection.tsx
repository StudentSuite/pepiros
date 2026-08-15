import { Card } from "@/components/shadcn/card";

/** Shared frame for a settings section, so the five sections stay aligned. */
export function SettingsSection({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "border-pillar-5/40 bg-card p-s-5"
          : "border-border bg-card p-s-5"
      }
    >
      <h2 className="font-serif text-base text-ink">{title}</h2>
      {description && (
        <p className="mt-s-1 font-sans text-sm text-ink-muted">{description}</p>
      )}
      <div className="mt-s-5">{children}</div>
    </Card>
  );
}
