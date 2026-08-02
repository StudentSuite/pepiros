// TODO: streamable HTTP transport + OAuth 2.1 w/ dynamic client registration (required for claude.ai Connectors).
// Wraps Supabase Auth as the identity provider. Calls only lib/services/*, same as app/api/*. See PLAN-V1.md §13.4.
// Assume stdio-only from the start per §17 risk note; OAuth is the stretch, decide by Aug 16.
