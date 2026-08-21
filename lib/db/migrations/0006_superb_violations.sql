ALTER TABLE "workspaces" ADD COLUMN "owner_id" text;--> statement-breakpoint
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces" USING btree ("owner_id");