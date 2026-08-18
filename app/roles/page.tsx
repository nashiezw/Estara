import { requireChatGPTUser } from "../chatgpt-auth";
import RolesClient from "./roles-client";
import "./roles.css";
export const dynamic="force-dynamic";
export default async function RolesPage(){await requireChatGPTUser("/roles");return <RolesClient/>}
