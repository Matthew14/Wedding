import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Rebecca & Matthew's Wedding",
  description: "Join us for our special day! Find all the details about our wedding celebration.",
  keywords: ["wedding", "Rebecca", "Matthew", "celebration", "Vilanova i la Geltrú"],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: "Rebecca & Matthew's Wedding",
    description: "Join us for our special day! Find all the details about our wedding celebration.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <MantineProvider>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}