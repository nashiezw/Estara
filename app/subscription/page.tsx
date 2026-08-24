import { requireChatGPTUser } from "../chatgpt-auth";
import { getPlatformIdentity } from "../../db/platform-settings";
import PlatformToolHeader from "../components/PlatformToolHeader";
import SubscriptionClient from "./subscription-client";
export const dynamic="force-dynamic";
export default async function SubscriptionPage(){await requireChatGPTUser("/subscription");const platform=await getPlatformIdentity(),brand={shortName:platform.shortName,platformName:platform.platformName,logoUrl:platform.logoUrl,iconUrl:platform.iconUrl,primaryColor:platform.primaryColor,accentColor:platform.accentColor};return <main className="subscription-page"><PlatformToolHeader platform={brand} section="Plan & billing"/><SubscriptionClient platform={brand}/></main>}
