import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { QueryProvider } from '@/lib/providers/QueryProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'IntegrityOS - Диагностика трубопроводов',
    template: '%s | IntegrityOS',
  },
  description:
    'Система диагностики и управления объектами трубопроводной инфраструктуры с интерактивной визуализацией на карте',
  keywords: [
    'диагностика трубопроводов',
    'инфраструктура',
    'мониторинг',
    'IntegrityOS',
    'pipeline diagnostics',
  ],
  authors: [{ name: 'IntegrityOS' }],
  creator: 'IntegrityOS',
  publisher: 'IntegrityOS',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  ),
  openGraph: {
    title: 'IntegrityOS - Диагностика трубопроводов',
    description:
      'Система диагностики и управления объектами трубопроводной инфраструктуры',
    type: 'website',
    locale: 'ru_RU',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
