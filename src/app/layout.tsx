import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VendorSync",
  description: "One place for vendors to manage every property-management portal: compliance, invoices, and payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
