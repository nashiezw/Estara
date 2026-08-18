import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import { DEFAULT_PLATFORM_IDENTITY } from "../db/platform-defaults";
import "./globals.css";
const geist=Geist({variable:"--font",subsets:["latin"]});
export async function generateMetadata():Promise<Metadata>{
 const h=await headers(); const host=h.get("host")||"localhost:3000"; const protocol=h.get("x-forwarded-proto")||"https"; const image=`${protocol}://${host}/og.png`;
 const platform=DEFAULT_PLATFORM_IDENTITY;
 return {title:`${platform.platformName} — ${platform.tagline}`,description:platform.descriptor,icons:{icon:"/favicon.svg"},openGraph:{title:platform.platformName,description:platform.tagline,images:[image]},twitter:{card:"summary_large_image",title:platform.platformName,description:platform.tagline,images:[image]}};
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={geist.variable}>{children}</body></html>}
