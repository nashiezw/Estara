import { requireChatGPTUser } from "../chatgpt-auth";
import "./platform-admin.css";
import PlatformAdminClient from "./platform-admin-client";
export const dynamic="force-dynamic";
export default async function AdminPage(){const user=await requireChatGPTUser("/admin");return <PlatformAdminClient displayName={user.fullName||user.email}/>}
