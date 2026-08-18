import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { ensureAgencySubscription } from "./entitlements";
import { ensurePlatformIdentity } from "./platform-settings";
export type WorkspaceContext={agencyId:string;agencyName:string;userId:string};
export async function requireWorkspace(user:ChatGPTUser):Promise<WorkspaceContext>{
 const existing=await env.DB.prepare(`SELECT m.agency_id AS agencyId,a.name AS agencyName FROM agency_memberships m JOIN agencies a ON a.id=m.agency_id WHERE m.user_id=? ORDER BY m.created_at ASC LIMIT 1`).bind(user.userId).first<{agencyId:string;agencyName:string}>();
 if(existing){await ensureSettings(existing.agencyId);await ensureAgencySubscription(existing.agencyId,user.userId);return{...existing,userId:user.userId}};
 const agencyId=crypto.randomUUID();
 await env.DB.batch([env.DB.prepare("INSERT INTO agencies (id,name,slug) VALUES (?,?,?)").bind(agencyId,"Prime Property",`prime-${agencyId.slice(0,8)}`),env.DB.prepare("INSERT INTO agency_memberships (id,agency_id,user_id,email,role) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),agencyId,user.userId,user.email,"principal")]);
 await ensureSettings(agencyId);await ensureAgencySubscription(agencyId,user.userId);return{agencyId,agencyName:"Prime Property",userId:user.userId};
}
export function calculateCompleteness(i:{title:string;location:string;priceMinor:number;bedrooms:number;bathrooms:number;photoCount:number;ownerPhone:string;landSize:string}){const v=[i.title,i.location,i.priceMinor>0,i.bedrooms>0,i.bathrooms>0,i.photoCount>=8,i.ownerPhone,i.landSize];return Math.round(v.filter(Boolean).length/v.length*100)}

async function ensureSettings(agencyId:string){await ensurePlatformIdentity();await env.DB.prepare("INSERT OR IGNORE INTO agency_settings (agency_id,tagline,primary_color,accent_color) VALUES (?,?,?,?)").bind(agencyId,"Property, professionally handled.","#153b34","#e6bd5f").run()}
