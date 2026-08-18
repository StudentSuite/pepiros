CREATE TABLE "mcp_oauth_clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"client_secret_hash" text,
	"client_name" text,
	"redirect_uris" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_oauth_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"client_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"scope" "mcp_token_scope" NOT NULL,
	"workspace_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_oauth_codes_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "mcp_oauth_codes" ADD CONSTRAINT "mcp_oauth_codes_client_id_mcp_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."mcp_oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_oauth_codes" ADD CONSTRAINT "mcp_oauth_codes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;