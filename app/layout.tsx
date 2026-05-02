import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { AppHeader } from "@/components/app-header";
import { SherpAICommandCenter } from "@/components/sherpai-command-center";
import { Providers } from "@/app/providers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AvyTS Terrain Intelligence",
    template: "%s · AvyTS",
  },
  description: "Official TerraSatch prototype for avalanche terrain intelligence across Utah's Wasatch Front.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#133b63",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen bg-background">
            <AppHeader isAuthenticated={Boolean(session)} />
            <main>{children}</main>
            <SherpAICommandCenter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
