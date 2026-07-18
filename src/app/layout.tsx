import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VERTEGA Studio — Radical Architectural Spaces | Delhi NCR",
  description:
    "VERTEGA Studio crafts radical, high-performance architectural spaces across the Delhi NCR region. Luxury design engineered for the Indian landscape.",
  keywords: [
    "architecture studio",
    "Delhi NCR architect",
    "luxury architecture India",
    "modern architecture Delhi",
    "VERTEGA Studio",
  ],
  openGraph: {
    title: "VERTEGA Studio — Radical Architectural Spaces",
    description:
      "High-end architectural design for the Indian landscape. Thermal micro-climate engineering, elite material curation, and turnkey project management.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
