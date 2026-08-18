import { requireChatGPTUser } from "../chatgpt-auth";
import SellerPortalClient from "./seller-portal-client";
export const dynamic="force-dynamic";
async function Portal({token}:{token:string}){const user=await requireChatGPTUser(token?`/seller?token=${encodeURIComponent(token)}`:"/seller");return <SellerPortalClient displayName={user.fullName||user.email} token={token}/>}
export default async function SellerPage({searchParams}:{searchParams:Promise<{token?:string}>}){const params=await searchParams;return <Portal token={String(params.token||"")}/>}
