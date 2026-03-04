import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELYO — Employee Wellbeing",
  description: "Employee Wellbeing Platform — anonym, sicher, menschlich.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
