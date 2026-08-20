import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import { getPlatformIdentity } from "../db/platform-settings";
import "./globals.css";
const geist=Geist({variable:"--font",subsets:["latin"]});
export async function generateMetadata():Promise<Metadata>{
 const h=await headers(); const host=h.get("host")||"localhost:3000"; const protocol=h.get("x-forwarded-proto")||"https"; const image=`${protocol}://${host}/og.png`;
 const platform=await getPlatformIdentity();
 return {title:`${platform.platformName} — ${platform.tagline}`,description:platform.descriptor,icons:{icon:platform.iconUrl||"/favicon.svg",apple:platform.iconUrl||"/favicon.svg"},openGraph:{title:platform.platformName,description:platform.tagline,siteName:platform.platformName,images:[platform.logoUrl||image]},twitter:{card:"summary_large_image",title:platform.platformName,description:platform.tagline,images:[platform.logoUrl||image]}};
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={geist.variable}>{children}</body></html>}
