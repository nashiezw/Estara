import { requireChatGPTUser } from "../chatgpt-auth";
import { getPlatformIdentity } from "../../db/platform-settings";
import RolesClient from "./roles-client";
import "./roles.css";
export const dynamic="force-dynamic";
export default async function RolesPage(){await requireChatGPTUser("/roles");const platform=await getPlatformIdentity();return <RolesClient platform={{shortName:platform.shortName}}/>}
