import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";
const geist=Geist({variable:"--font",subsets:["latin"]});
export async function generateMetadata():Promise<Metadata>{
 const h=await headers(); const host=h.get("host")||"localhost:3000"; const protocol=h.get("x-forwarded-proto")||"https"; const image=`${protocol}://${host}/og.png`;
 return {title:"ESTARA — Your Real Estate Business. Running Smarter.",description:"The operating system for a modern real estate business.",icons:{icon:"/favicon.svg"},openGraph:{title:"ESTARA",description:"Your Real Estate Business. Running Smarter.",images:[image]},twitter:{card:"summary_large_image",title:"ESTARA",description:"Your Real Estate Business. Running Smarter.",images:[image]}};
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={geist.variable}>{children}</body></html>}
