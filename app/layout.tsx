import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Conductor',
    description: 'Conductor Agent Network',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
