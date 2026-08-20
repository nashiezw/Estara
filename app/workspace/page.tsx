import { requireChatGPTUser } from "../chatgpt-auth";
import EstaraApp from "../estara-app";

export const dynamic = "force-dynamic";

export default async function Workspace() {
  await requireChatGPTUser("/workspace");
  return <EstaraApp />;
}
