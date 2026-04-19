import type { Metadata, Viewport } from "next"
import { Fraunces, DM_Sans } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/shared/Providers"
import { ServiceWorkerRegistration } from "@/components/shared/ServiceWorkerRegistration"
import { InstallBanner } from "@/components/ui/InstallBanner"

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "ELYO — Employee Wellbeing",
  description: "Employee Wellbeing Platform — anonym, sicher, menschlich.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ELYO",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1B4D3E",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
        <InstallBanner />
      </body>
    </html>
  )
}
