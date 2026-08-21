ALTER TABLE "chunks" ADD COLUMN "workspace_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "numerics" ADD COLUMN "workspace_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "numerics" ADD CONSTRAINT "numerics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_paper_id_idx" ON "chunks" USING btree ("paper_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chunks_workspace_id_ordinal_idx" ON "chunks" USING btree ("workspace_id","ordinal");--> statement-breakpoint
CREATE INDEX "edges_workspace_id_idx" ON "edges" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "evidence_node_id_idx" ON "evidence" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "nodes_workspace_id_idx" ON "nodes" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "numerics_workspace_id_ordinal_idx" ON "numerics" USING btree ("workspace_id","ordinal");--> statement-breakpoint
CREATE INDEX "papers_workspace_id_idx" ON "papers" USING btree ("workspace_id");