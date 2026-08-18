import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../app/chatgpt-auth";
export type WorkspaceContext={agencyId:string;agencyName:string;userId:string};
export async function requireWorkspace(user:ChatGPTUser):Promise<WorkspaceContext>{
 const existing=await env.DB.prepare(`SELECT m.agency_id AS agencyId,a.name AS agencyName FROM agency_memberships m JOIN agencies a ON a.id=m.agency_id WHERE m.user_id=? ORDER BY m.created_at ASC LIMIT 1`).bind(user.userId).first<{agencyId:string;agencyName:string}>();
 if(existing)return{...existing,userId:user.userId};
 const agencyId=crypto.randomUUID();
 await env.DB.batch([env.DB.prepare("INSERT INTO agencies (id,name,slug) VALUES (?,?,?)").bind(agencyId,"Prime Property",`prime-${agencyId.slice(0,8)}`),env.DB.prepare("INSERT INTO agency_memberships (id,agency_id,user_id,email,role) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),agencyId,user.userId,user.email,"principal")]);
 await seedAgency(agencyId,user.userId);return{agencyId,agencyName:"Prime Property",userId:user.userId};
}
async function seedAgency(agencyId:string,userId:string){
 const rows=[["EST-2401","Garden sanctuary in Greendale","Greendale, Harare",18000000,"US$180,000",4,3,"Available",18,"+263 77 234 9810","2,100 m²",100],["EST-2398","Modern family home","Borrowdale, Harare",32000000,"US$320,000",5,4,"Available",14,"+263 71 990 2221","3,400 m²",100],["EST-2410","Sunlit townhouse","Newlands, Harare",145000,"US$1,450 / month",3,2,"Draft",5,"","",75]] as const;
 const ids=rows.map(()=>crypto.randomUUID());const statements=rows.map((r,i)=>env.DB.prepare(`INSERT INTO properties (id,agency_id,reference,title,location,price_minor,currency,price_label,bedrooms,bathrooms,status,photo_count,owner_phone,land_size,completeness,created_by) VALUES (?,?,?,?,?,?,'USD',?,?,?,?,?,?,?,?,?)`).bind(ids[i],agencyId,...r,userId));
 const now=Date.now();const leads=[["Tariro Moyo","TM","Garden sanctuary in Greendale","New",now+18*60000,ids[0]],["Daniel Ncube","DN","Modern family home","Waiting",now-14*60000,ids[1]],["Nyasha Dube","ND","Sunlit townhouse","Contacted",now+86400000,ids[2]]] as const;
 for(const r of leads)statements.push(env.DB.prepare(`INSERT INTO enquiries (id,agency_id,property_id,contact_name,initials,property_label,status,source,response_due_at) VALUES (?,?,?,?,?,?,?,'Website',?)`).bind(crypto.randomUUID(),agencyId,r[5],r[0],r[1],r[2],r[3],new Date(r[4]).toISOString()));await env.DB.batch(statements);
}
export function calculateCompleteness(i:{title:string;location:string;priceMinor:number;bedrooms:number;bathrooms:number;photoCount:number;ownerPhone:string;landSize:string}){const v=[i.title,i.location,i.priceMinor>0,i.bedrooms>0,i.bathrooms>0,i.photoCount>=8,i.ownerPhone,i.landSize];return Math.round(v.filter(Boolean).length/v.length*100)}
