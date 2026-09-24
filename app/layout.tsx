import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Insurance Document Upload Portal',
  description: 'Upload an insurance document for processing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
