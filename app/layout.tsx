import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import { getPlatformIdentity } from "../db/platform-settings";
import { platformIconUrl, platformLogoUrl, platformOrigin, platformSeoDescription } from "../db/public-seo";
import "./globals.css";

const geist = Geist({ variable: "--font", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const platform = await getPlatformIdentity();
  const origin = platformOrigin(h, platform);
  const description = platformSeoDescription(platform);
  const icon = platformIconUrl(origin, platform) || platform.iconUrl || "/favicon.svg";
  const image = platformLogoUrl(origin, platform) || platform.logoUrl || "/og.png";

  return {
    metadataBase: new URL(origin),
    applicationName: platform.platformName,
    title: {
      default: `${platform.platformName} | ${platform.tagline}`,
      template: `%s | ${platform.shortName}`,
    },
    description,
    alternates: { canonical: origin },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: icon }],
      shortcut: [icon],
      apple: [icon],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: platform.platformName,
      description,
      url: origin,
      siteName: platform.platformName,
      type: "website",
      locale: "en_ZW",
      images: image ? [{ url: image, alt: `${platform.shortName} brand` }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: platform.platformName,
      description,
      images: image ? [image] : [],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={geist.variable}>{children}</body></html>;
}
