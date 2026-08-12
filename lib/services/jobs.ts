import "server-only";
import { randomUUID } from "node:crypto";
import { JOB_STAGES, type JobStage } from "./upload";

/**
 * Ingest job tracking (docs/PLAN-V1.md §6). The `jobs`/`job_events` tables
 * already exist in lib/db/schema.ts, but there is no live Postgres to write
 * them to (CLAUDE.md's current data seam), so this keeps jobs in a
 * process-local map with the same shape a DB-backed version would expose.
 *
 * Being explicit about the limitation: this does not survive a restart and does
 * not work across serverless instances. It is enough to drive the progress UI
 * against a real endpoint today, and the swap to a `job_events` read is
 * confined to this file.
 */

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface JobEvent {
  stage: JobStage;
  message: string;
  at: number;
}

export interface Job {
  id: string;
  workspaceId: string;
  status: JobStatus;
  source: Record<string, unknown>;
  events: JobEvent[];
  error?: string;
}

declare global {
  var __pepirosJobs: Map<string, Job> | undefined;
}

/** Survives dev hot-reload, which would otherwise drop in-flight jobs. */
function store(): Map<string, Job> {
  if (!global.__pepirosJobs) global.__pepirosJobs = new Map();
  return global.__pepirosJobs;
}

export function createJob(input: { workspaceId: string; source: Record<string, unknown> }): Job {
  const job: Job = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    status: "queued",
    source: input.source,
    events: [{ stage: "Fetching PDF", message: "Accepted, queued for parsing.", at: Date.now() }],
  };
  store().set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return store().get(id);
}

export function appendEvent(id: string, stage: JobStage, message: string): void {
  const job = store().get(id);
  if (!job) return;
  job.events.push({ stage, message, at: Date.now() });
  job.status = stage === "Ready" ? "done" : "running";
}

export function failJob(id: string, error: string): void {
  const job = store().get(id);
  if (!job) return;
  job.status = "failed";
  job.error = error;
}

/**
 * The full stage list, each marked done/current/pending. §6 wants the UI able
 * to show the whole sequence up front -- knowing only the current stage makes
 * a 45s pipeline feel like an indeterminate wait.
 */
export function stageProgress(job: Job): Array<{ stage: JobStage; state: "done" | "current" | "pending" }> {
  const reached = new Set(job.events.map((e) => e.stage));
  const currentIndex = Math.max(...[...reached].map((s) => JOB_STAGES.indexOf(s)), 0);

  return JOB_STAGES.map((stage, i) => ({
    stage,
    state: i < currentIndex ? "done" : i === currentIndex ? "current" : "pending",
  }));
}
