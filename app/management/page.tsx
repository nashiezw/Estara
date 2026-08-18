import { requireChatGPTUser } from "../chatgpt-auth";
import ManagementClient from "./management-client";
import "../workspace-tools.css";
import "./management.css";
export const dynamic="force-dynamic";
export default async function Page(){await requireChatGPTUser("/management");return <ManagementClient/>}
