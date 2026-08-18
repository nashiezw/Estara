import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission } from "../../../db/authorization";
import { backupStatus, createAgencyBackup, verifyAgencyBackup } from "../../../db/backup";
export const dynamic = "force-dynamic";
async function context(permission: "backup.read" | "backup.manage") { const user = await getChatGPTUser(); if (!user)
    return null; const workspace = await requireWorkspace(user); await requirePermission(workspace, permission); return { user, workspace }; }
const fail = (error: unknown) => error instanceof AuthorizationError ? Response.json({ error: error.message }, { status: 403 }) : Response.json({ error: error instanceof Error ? error.message : "Backup operation failed." }, { status: 503 });
export async function GET() { try {
    const c = await context("backup.read");
    if (!c)
        return Response.json({ error: "Sign in is required." }, { status: 401 });
    await createAgencyBackup(c.workspace, "system:daily-backup").catch(() => null);
    return Response.json({ snapshots: await backupStatus(c.workspace), policy: { encryption: "AES-256-GCM", frequency: "Daily on monitored activity", retentionDays: 35, storage: "Tenant-isolated private object storage" } }, { headers: { "cache-control": "private, no-store" } });
}
catch (error) {
    return fail(error);
} }
export async function POST(request:Request) { try {
    const c = await context("backup.manage");
    if (!c)
        return Response.json({ error: "Sign in is required." }, { status: 401 });
    const body=await request.json().catch(()=>({})) as{action?:string;id?:string};if(body.action==="verify")return Response.json({drill:await verifyAgencyBackup(c.workspace,c.user.userId,body.id)});return Response.json({ snapshot: await createAgencyBackup(c.workspace, c.user.userId, true) }, { status: 201 });
}
catch (error) {
    return fail(error);
} }
