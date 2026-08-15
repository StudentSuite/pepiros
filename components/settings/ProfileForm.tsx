"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Textarea } from "@/components/shadcn/textarea";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { SettingsRow } from "./SettingsRow";
import type { Profile } from "@/lib/data/types";

const BIO_MAX = 280;

export function ProfileForm({
  profile,
  readOnly = false,
}: {
  profile: Profile;
  readOnly?: boolean;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);

  const dirty = displayName !== profile.displayName || bio !== profile.bio;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    toast.success("Saved", {
      description: readOnly
        ? "Shared demo account, so this is not persisted."
        : undefined,
    });
  }

  return (
    <form onSubmit={save}>
      <SettingsRow
        label="Avatar"
        description="Generated from your initials. Image upload is not available yet."
      >
        <Avatar className="size-12">
          <AvatarFallback className="bg-accent font-mono text-sm text-white">
            {profile.avatarInitials}
          </AvatarFallback>
        </Avatar>
      </SettingsRow>

      <SettingsRow
        label="Username"
        description="Your public profile lives here. Usernames cannot be changed yet."
      >
        {/* Read-only, so it is rendered as text rather than a disabled input:
            a greyed-out field invites clicking and then does nothing. */}
        <p className="truncate font-mono text-sm text-ink-muted">
          pepiros.dev/u/{profile.username}
        </p>
      </SettingsRow>

      <SettingsRow
        label="Display name"
        description="Shown on your profile and next to anything you publish."
        htmlFor="displayName"
      >
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          disabled={readOnly}
        />
      </SettingsRow>

      <SettingsRow
        label="Bio"
        description="A line or two about what you read, and why."
        htmlFor="bio"
        align="start"
      >
        <div>
          <Textarea
            id="bio"
            rows={4}
            value={bio}
            maxLength={BIO_MAX}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Clinical NLP and coastal ecology. I read a lot of papers I did not write."
            disabled={readOnly}
            className="resize-none"
          />
          <p className="mt-1.5 text-right font-mono text-[11px] tabular-nums text-ink-faint">
            {bio.length} / {BIO_MAX}
          </p>
        </div>
      </SettingsRow>

      <div className="flex items-center gap-s-3 pt-s-5">
        <Button type="submit" disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {dirty && !saving && (
          <span className="font-sans text-xs text-ink-faint">
            Unsaved changes
          </span>
        )}
      </div>
    </form>
  );
}
