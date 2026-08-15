"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Textarea } from "@/components/shadcn/textarea";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import type { Profile } from "@/lib/data/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // The demo account has no write path; saying so is better than a fake
    // success toast that implies persistence.
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    toast.success("Saved", {
      description: "On the demo account this is not persisted.",
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-s-5">
      <div className="flex items-center gap-s-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-accent font-mono text-sm text-white">
            {profile.avatarInitials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-sans text-sm text-ink">@{profile.username}</p>
          <p className="font-mono text-[11px] text-ink-faint">
            Joined {profile.joinedAt}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-s-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-s-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What do you read, and why?"
        />
        <p className="font-mono text-[11px] text-ink-faint">
          Shown on your public profile at /u/{profile.username}
        </p>
      </div>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
