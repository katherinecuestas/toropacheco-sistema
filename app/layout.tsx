import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Abogados en Santiago | Toro Pacheco & Asociados — Laboral, Familia y Civil",
  description: "Abogados en Santiago especializados en derecho laboral, familia y deudas. Consulta gratuita en 24h. Más de 200 casos resueltos. Llámanos hoy.",
  keywords: "abogado laboral Santiago, abogado familia Chile, defensa embargo, juicio ejecutivo Chile, divorcio Chile",
  openGraph: {
    title: "Toro Pacheco & Asociados — Abogados en Santiago",
    description: "Consulta gratuita en 24h. Especialistas en derecho laboral, familia y deudas.",
    url: "https://www.toropachecoasociados.cl",
    siteName: "Toro Pacheco & Asociados",
    locale: "es_CL",
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
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
