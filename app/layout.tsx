import type { Metadata } from "next";
import { Dosis } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const dosis = Dosis({
  variable: "--font-dosis",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Think different Academy",
  description: "Tour de App – Think different Academy",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${dosis.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
