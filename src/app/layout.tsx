import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Song Tournament",
  description: "A shared song bank, voting board, and poll workspace for a band."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
