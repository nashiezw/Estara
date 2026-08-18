import { requireChatGPTUser } from "../chatgpt-auth";
import ManagementClient from "./management-client";
import "../workspace-tools.css";
import "./management.css";
export const dynamic="force-dynamic";
export default async function Page(){await requireChatGPTUser("/management");return <><ManagementClient/><a style={{position:"fixed",right:22,bottom:22,zIndex:40,background:"#153b34",color:"white",padding:"13px 18px",borderRadius:999,textDecoration:"none",fontWeight:800}} href="/property-operations">Property care →</a></>}
