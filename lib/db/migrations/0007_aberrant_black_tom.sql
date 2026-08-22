CREATE TABLE "indexed_catalog" (
	"slug" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"paper_id" text NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "indexed_catalog" ADD CONSTRAINT "indexed_catalog_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;