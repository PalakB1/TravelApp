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
      <head>
        {/* Apply the saved theme before first paint so there's no light flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
