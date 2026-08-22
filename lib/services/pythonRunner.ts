import "server-only";
import { spawn } from "node:child_process";

/**
 * Runs a local Python script (scripts/parse.py, invoked from
 * lib/services/ingest.ts and scripts/measure-drop-rate.ts) and returns its
 * stdout parsed as JSON.
 *
 * The interpreter name is probed once rather than hardcoded: some systems
 * only expose `python`, others only `python3`, and on Windows `python3` is
 * frequently a Microsoft Store stub that is not an interpreter at all. See
 * resolveInterpreter() below for why probing replaced the old
 * try-python3-then-fall-back-on-ENOENT approach.
 */

// Issue #268: a hang here (a stalled model load, a pathological PDF spinning
// some loop in scripts/parse.py) used to leave this promise never resolving
// or rejecting -- the job's status stayed "running" forever in jobs.ts's
// in-memory map, and the orphaned Python process (with any loaded
// torch/onnxruntime weights) kept running indefinitely. 5 minutes is
// generous for a single-paper parse -- real runs observed live finish in
// well under a minute -- while still bounding the worst case.
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

async function spawnAndCollect(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`${command} ${args[0] ?? ""} timed out after ${Math.round(timeoutMs / 1000)}s and was killed.`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

/**
 * Which interpreter name actually works here, probed once and remembered.
 *
 * WHY PROBING, RATHER THAN TRYING python3 AND FALLING BACK ON ENOENT.
 * Windows ships an App Execution Alias at
 * `%LOCALAPPDATA%\Microsoft\WindowsApps\python3.exe`, and it is usually first
 * on PATH. It is a Store stub, not an interpreter. Spawned from a shell it
 * opens the Store and exits; spawned from Node with no console attached it
 * simply hangs, holding the pipe open forever.
 *
 * That is not ENOENT, so the old fallback never fired: the run sat there
 * until the 5-minute timeout, then reported "python3 timed out" and gave up
 * without ever trying `python`, which on the same machine works fine. Caught
 * live on Windows with a real Python 3.14 install where `python3 --version`
 * from a shell answers instantly.
 *
 * So each candidate is probed with `--version` under a short timeout, and the
 * first one that actually answers is used. A stub that hangs is skipped in
 * seconds instead of costing the whole parse budget.
 */
const PROBE_TIMEOUT_MS = 10_000;
let resolvedInterpreter: string | null = null;

async function resolveInterpreter(): Promise<string> {
  if (resolvedInterpreter) return resolvedInterpreter;

  // `python` first on Windows: `python3` there is the Store alias more often
  // than it is a real interpreter. Elsewhere `python3` is the correct name and
  // `python` may still be Python 2.
  const candidates = process.platform === "win32" ? ["python", "python3"] : ["python3", "python"];

  for (const candidate of candidates) {
    try {
      const probe = await spawnAndCollect(candidate, ["--version"], PROBE_TIMEOUT_MS);
      if (probe.code === 0 && /Python 3/.test(probe.stdout + probe.stderr)) {
        resolvedInterpreter = candidate;
        return candidate;
      }
    } catch {
      // ENOENT, a hang, or a non-Python 3 answer: try the next name.
    }
  }

  throw new Error(
    'Could not find a working Python 3 interpreter (tried "python" and "python3"). ' +
      "Install Python 3 and make sure it is on PATH. On Windows, check that " +
      "python3 is not resolving to the Microsoft Store stub in WindowsApps.",
  );
}

export async function runPythonScript<T>(scriptPath: string, args: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const interpreter = await resolveInterpreter();
  let result: { stdout: string; stderr: string; code: number | null };
  try {
    result = await spawnAndCollect(interpreter, [scriptPath, ...args], timeoutMs);
  } catch (err) {
    throw new Error(
      `Could not run ${scriptPath} with ${interpreter}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // A python process can print its full, valid JSON output and still exit
  // non-zero from an unrelated post-print teardown crash -- observed live on
  // figure-bearing PDFs (issue #59): Pix2Text's onnxruntime/CoreML teardown
  // throws `libc++abi: recursive_mutex lock failed` on this machine, after
  // stdout is already fully written. Trust real, complete stdout over an
  // incidental exit code; only report failure when there's no valid JSON to
  // recover, which is still the exit-code-driven error for a genuine crash.
  try {
    return JSON.parse(result.stdout) as T;
  } catch (err) {
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || `${scriptPath} exited with code ${result.code}.`);
    }
    throw new Error(`${scriptPath} produced invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}
