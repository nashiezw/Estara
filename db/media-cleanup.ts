import { env } from "cloudflare:workers";

type CleanupJob = { id: string; objectKeys: string; attempts: number };
type MediaBucket = Pick<R2Bucket, "delete">;

const keys = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string" && key.length > 0) : [];
  } catch {
    return [];
  }
};

export async function processMediaCleanupJob(id: string, storage: MediaBucket = env.MEDIA) {
  const job = await env.DB.prepare("SELECT id,object_keys AS objectKeys,attempts FROM media_cleanup_jobs WHERE id=? AND status='pending'").bind(id).first<CleanupJob>();
  if (!job) return { deleted: true, missing: true };
  try {
    const objectKeys = keys(job.objectKeys);
    if (objectKeys.length) await storage.delete(objectKeys);
    await env.DB.prepare("DELETE FROM media_cleanup_jobs WHERE id=? AND status='pending'").bind(id).run();
    return { deleted: true, missing: false };
  } catch (error) {
    const attempts = Number(job.attempts || 0) + 1;
    const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
    await env.DB.prepare("UPDATE media_cleanup_jobs SET attempts=?,last_error=?,next_attempt_at=datetime('now',?),updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'")
      .bind(attempts, error instanceof Error ? error.message.slice(0, 500) : "Storage cleanup failed", `+${delayMinutes} minutes`, id).run();
    return { deleted: false, missing: false };
  }
}

export async function processDueMediaCleanupJobs(limit = 25) {
  const jobs = await env.DB.prepare("SELECT id FROM media_cleanup_jobs WHERE status='pending' AND datetime(next_attempt_at)<=CURRENT_TIMESTAMP ORDER BY datetime(next_attempt_at),created_at LIMIT ?").bind(limit).all<{ id: string }>();
  let deleted = 0;
  let pending = 0;
  for (const job of jobs.results) {
    const result = await processMediaCleanupJob(job.id);
    if (result.deleted) deleted += 1;
    else pending += 1;
  }
  return { processed: jobs.results.length, deleted, pending };
}
