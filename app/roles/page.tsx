import { requireChatGPTUser } from "../chatgpt-auth";
import { getPlatformIdentity } from "../../db/platform-settings";
import PlatformToolHeader from "../components/PlatformToolHeader";
import RolesClient from "./roles-client";
import "./roles.css";
export const dynamic="force-dynamic";
export default async function RolesPage(){await requireChatGPTUser("/roles");const platform=await getPlatformIdentity(),brand={shortName:platform.shortName,platformName:platform.platformName,logoUrl:platform.logoUrl,iconUrl:platform.iconUrl,darkLogoUrl:platform.darkLogoUrl,darkIconUrl:platform.darkIconUrl,primaryColor:platform.primaryColor,accentColor:platform.accentColor};return <main className="roles-page"><PlatformToolHeader platform={brand} section="Agency access"/><RolesClient platform={{shortName:platform.shortName}}/></main>}
