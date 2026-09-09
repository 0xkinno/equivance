import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EQUIVANCE — Corporate-Action-Coherent Credit Layer for Tokenized Stocks on Base",
  description:
    "EQUIVANCE eliminates corporate action desynchronization by deriving stock-backed credit strictly from live Base B20 / ERC-8056 scheduled UI multipliers at the execution block timestamp.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col font-sans bg-[#FBFBF9] text-neutral-900 antialiased selection:bg-neutral-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
