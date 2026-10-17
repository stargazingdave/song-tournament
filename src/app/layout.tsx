import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Song Tournament",
  description: "Private band workspaces for songs, polls, and set lists."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
