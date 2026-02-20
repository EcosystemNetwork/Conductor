import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Conductor — Agent Network Dashboard',
    description: 'Conductor Agent Network',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.ico" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
            </head>
            <body style={{ margin: 0 }}>{children}</body>
        </html>
    );
}
