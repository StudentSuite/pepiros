import "server-only";
import { spawn } from "node:child_process";

/**
 * Runs a local Python script (scripts/parse.py, invoked from
 * lib/services/ingest.ts and scripts/measure-drop-rate.ts) and returns its
 * stdout parsed as JSON.
 *
 * Tries `python3` first, then falls back to `python` on ENOENT. Some
 * systems (this was hit live: a real ingest attempt failed with
 * "spawn python3 ENOENT") only expose a `python` command -- particularly
 * common on Windows, and on some Python installations elsewhere that don't
 * create a `python3` symlink even though `python3 --version` would report
 * Python 3.x if it existed. Failing over rather than hardcoding one name
 * means this works on either without the user needing to know which their
 * system uses.
 */
async function spawnAndCollect(command: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, code }));
  });
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
}

export async function runPythonScript<T>(scriptPath: string, args: string[]): Promise<T> {
  let result: { stdout: string; stderr: string; code: number | null };
  try {
    result = await spawnAndCollect("python3", [scriptPath, ...args]);
  } catch (err) {
    if (!isNotFoundError(err)) {
      throw new Error(`Could not run ${scriptPath} with python3: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      result = await spawnAndCollect("python", [scriptPath, ...args]);
    } catch (fallbackErr) {
      throw new Error(
        `Could not find a Python interpreter (tried "python3" and "python"). ` +
          `Install Python 3 and make sure it's on PATH. ` +
          `Original error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
      );
    }
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
