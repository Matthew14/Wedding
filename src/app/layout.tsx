import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Great_Vibes } from "next/font/google";
import "./globals.css";
import { MantineProvider, ColorSchemeScript, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/contexts/AuthContext";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PageViewTracker } from "@/components/PageViewTracker";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Footer } from "@/components/Footer";
import { Suspense } from "react";

const geist = Geist({
    subsets: ["latin"],
    variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});

const playfair = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-playfair",
    display: "swap",
});

const greatVibes = Great_Vibes({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-great-vibes",
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://wedding.matthewoneill.com"),
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
        images: [
            {
                url: "/og-invitation.png",
                width: 1200,
                height: 630,
                alt: "Rebecca & Matthew's Wedding",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Rebecca & Matthew's Wedding",
        description: "Join us for our special day! Find all the details about our wedding celebration.",
        images: ["/og-invitation.png"],
    },
    other: {
        "color-scheme": "light",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
};

const theme = createTheme({
    colors: {
        gold: ['#faf8f5', '#e8e0d5', '#d4c8b5', '#c0af95', '#8b7355', '#6d5a44', '#5a4936', '#473828', '#34271a', '#21160d'],
        dark: ['#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#868e96', '#5a5a5a', '#2d2d2d', '#212529', '#16191d'],
    },
    primaryColor: 'gold',
    defaultRadius: 'md',
    fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headings: {
        fontFamily: 'var(--font-playfair), serif',
        fontWeight: '400',
    },
    black: '#2d2d2d',
    white: '#ffffff',
    other: {
        textPrimary: '#2d2d2d',
        textSecondary: '#5a5a5a',
        goldDark: '#6d5a44',
    },
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" data-mantine-color-scheme="light" data-scroll-behavior="smooth" style={{ colorScheme: 'light' }}>
            <head>
                <ColorSchemeScript forceColorScheme="light" />
                <meta name="color-scheme" content="light only" />
            </head>
            <body className={`${geist.variable} ${geistMono.variable} ${playfair.variable} ${greatVibes.variable} antialiased`} style={{ colorScheme: 'light', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <PostHogProvider>
                    <ErrorBoundary>
                        <Suspense fallback={null}>
                            <PageViewTracker />
                        </Suspense>
                        <MantineProvider theme={theme} forceColorScheme="light">
                            <AuthProvider>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {children}
                                </div>
                                <Footer />
                            </AuthProvider>
                        </MantineProvider>
                    </ErrorBoundary>
                </PostHogProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
