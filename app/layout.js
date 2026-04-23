import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title:
    "DJ Network E-learning — LMS élèves",
  description:
    "Espace e-learning DJ Network réservé aux élèves en formation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`dark ${inter.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
