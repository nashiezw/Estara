import { requireChatGPTUser } from "../chatgpt-auth";
import { getPlatformIdentity } from "../../db/platform-settings";
import "../workspace-tools.css";
import PlatformToolHeader from "../components/PlatformToolHeader";
import DomainClient from "./domains-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireChatGPTUser("/domains");
  const platform = await getPlatformIdentity();
  const brand = { shortName: platform.shortName, platformName: platform.platformName, logoUrl: platform.logoUrl, iconUrl: platform.iconUrl, darkLogoUrl: platform.darkLogoUrl, darkIconUrl: platform.darkIconUrl, primaryColor: platform.primaryColor, accentColor: platform.accentColor };
  return <main className="tool-page domain-page"><PlatformToolHeader platform={brand} section="Agency website" /><DomainClient platform={brand} /></main>;
}
