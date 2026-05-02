import type { Metadata } from 'next';
import './globals.css';
import InputBehavior from '@/components/InputBehavior';

export const metadata: Metadata = {
  title: 'CierreCaja Pro · IMPRIMEYA',
  description: 'Sistema de punto de venta y cierre de caja',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <InputBehavior />
        {children}
      </body>
    </html>
  );
}