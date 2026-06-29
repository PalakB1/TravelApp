import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trip Desk — travel dashboard",
  description: "Manage trips, bookings, payments and profit by chatting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
