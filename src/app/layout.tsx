import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import "@mantine/core/styles.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/contexts/AuthContext";

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
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/favicon.ico",
    },
    openGraph: {
        title: "Rebecca & Matthew's Wedding",
        description: "Join us for our special day! Find all the details about our wedding celebration.",
        type: "website",
    },
    other: {
        "color-scheme": "light",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" data-mantine-color-scheme="light" data-scroll-behavior="smooth">
            <head>
                <ColorSchemeScript />
            </head>
            <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
                <MantineProvider>
                    <AuthProvider>{children}</AuthProvider>
                </MantineProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
