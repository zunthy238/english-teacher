// app/layout.tsx
// Diseño raíz: fuentes de la identidad visual, idioma, título y colores de la PWA.
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Professor Mike",
  description: "Tu profesor de inglés con IA: una sesión guiada cada día.",
  appleWebApp: {
    capable: true,
    title: "Professor Mike",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#eef0fa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
