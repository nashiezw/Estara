import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../app/chatgpt-auth";
export type PlatformRole="super_admin"|"support"|"finance";
export type PlatformContext={userId:string;email:string;role:PlatformRole};
const ROLES=new Set<PlatformRole>(["super_admin","support","finance"]);
export class PlatformAuthorizationError extends Error{constructor(message="Platform administrator access is required."){super(message)}}
export async function requirePlatformUser(user:ChatGPTUser,allowed:readonly PlatformRole[]=["super_admin","support","finance"]):Promise<PlatformContext>{const count=await env.DB.prepare("SELECT COUNT(*) AS count FROM platform_users").first<{count:number}>();if(Number(count?.count||0)===0)await env.DB.prepare("INSERT OR IGNORE INTO platform_users (user_id,email,role,created_by) VALUES (?,?,?,?)").bind(user.userId,user.email,"super_admin",user.userId).run();const row=await env.DB.prepare("SELECT user_id AS userId,email,role FROM platform_users WHERE user_id=? AND active=1").bind(user.userId).first<PlatformContext>();if(!row||!ROLES.has(row.role)||!allowed.includes(row.role))throw new PlatformAuthorizationError();return row}
export async function writePlatformAudit(context:PlatformContext,action:string,type:string,id:string,detail:Record<string,unknown>={}){await env.DB.prepare("INSERT INTO audit_logs (id,agency_id,actor_user_id,action,resource_type,resource_id,detail) VALUES (?,NULL,?,?,?,?,?)").bind(crypto.randomUUID(),context.userId,action,type,id,JSON.stringify(detail)).run()}
