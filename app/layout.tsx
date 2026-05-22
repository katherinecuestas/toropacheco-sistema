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
  title: "Defensa ante Deudas y Embargos en Chile | Toro Pacheco & Asociados",
  description: "¿Juicio ejecutivo, embargo o deuda CAE? Abogados especialistas en defensa de deudores en Santiago. Consulta gratuita en 24h. Más de 200 casos resueltos.",
  keywords: "defensa juicio ejecutivo Chile, abogado embargo Santiago, deuda CAE abogado, paralizar embargo Chile, abogado deudas Santiago",
  openGraph: {
    title: "Toro Pacheco & Asociados — Defensa ante Deudas y Embargos",
    description: "¿Te embargaron o tienes un juicio ejecutivo? Te defendemos. Consulta gratuita en menos de 24h.",
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
