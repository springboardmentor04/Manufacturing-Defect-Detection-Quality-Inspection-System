import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VisionInspect AI - Manufacturing Quality Inspection',
  description: 'AI-Powered Manufacturing Defect Detection & Quality Control Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
