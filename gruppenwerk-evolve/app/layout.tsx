import type { Metadata } from 'next';
import { Providers } from '@/components/shared/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'GruppenwerkEvolve',
  description: 'Outbound-E-Mail-Workflow – automatisiert',
};

// Root Layout mit globalen Providern
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return (
    <html lang="de">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
