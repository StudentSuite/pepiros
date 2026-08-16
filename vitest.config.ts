import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // Several suites (synthesis.test.ts, nodes.test.ts, search.test.ts,
    // export.test.ts...) read/write the real "ws-1" workspace row against
    // the live Postgres project via lib/db/queries -- that used to be safe
    // under Vitest's default parallel file execution because each worker had
    // its own independent in-memory ingestStore Map. Now every worker shares
    // one external database, so two files touching "ws-1" at once race for
    // real (caught via a spurious findContradictions() result while
    // synthesis.test.ts wrote a contradicts edge into the same row from a
    // different file). Sequential file execution is the correct fix, not a
    // per-file workaround: it's the same shared-fixture-DB constraint any
    // integration test suite has.
    fileParallelism: false,
  },
});
