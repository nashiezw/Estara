import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { resolveAgencyPlan } from "../../../db/entitlements";
import { getPlatformIdentity } from "../../../db/platform-settings";
export const dynamic="force-dynamic";
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:"Sign in is required."},{status:401});const workspace=await requireWorkspace(user),plan=await resolveAgencyPlan(workspace.agencyId,user.userId),[invoices,platform]=await Promise.all([env.DB.prepare("SELECT id,invoice_number AS invoiceNumber,status,currency,subtotal_minor AS subtotalMinor,discount_minor AS discountMinor,total_minor AS totalMinor,due_at AS dueAt,issued_at AS issuedAt,paid_at AS paidAt,payment_method AS paymentMethod,provider_reference AS providerReference FROM billing_invoices WHERE agency_id=? ORDER BY issued_at DESC").bind(workspace.agencyId).all(),getPlatformIdentity()]);return Response.json({agency:{id:workspace.agencyId,name:workspace.agencyName},platform:{shortName:platform.shortName,platformName:platform.platformName,logoUrl:platform.logoUrl,iconUrl:platform.iconUrl,darkLogoUrl:platform.darkLogoUrl,darkIconUrl:platform.darkIconUrl,primaryColor:platform.primaryColor,accentColor:platform.accentColor},plan,invoices:invoices.results})}
