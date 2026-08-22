import { requireChatGPTUser } from "../chatgpt-auth";
import "../workspace-tools.css";
import DomainClient from "./domains-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireChatGPTUser("/domains");
  return <DomainClient />;
}
