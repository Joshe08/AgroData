import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroData Cesar | Plataforma de Gestión Agrícola",
  description:
    "Plataforma tecnológica para optimizar la gestión agrícola en el departamento del Cesar mediante análisis de datos, IA y monitoreo en tiempo real.",
  keywords: "agricultura, datos, Cesar, Colombia, gestión agrícola, tecnología",
  openGraph: {
    title: "AgroData Cesar",
    description: "Optimiza tu producción agrícola con datos e inteligencia artificial",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
