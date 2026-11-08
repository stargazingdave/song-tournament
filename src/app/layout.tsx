import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://song-tournament.vercel.app/'),
  title: "Song Tournament",
  description: "Keep your band’s songs, polls, and set lists together in one private workspace.",
  openGraph: { type: 'website', url: 'https://song-tournament.vercel.app/', title: "Song Tournament", description: "Keep your band’s songs, polls, and set lists together in one private workspace.", images: [{ url: 'https://song-tournament.vercel.app/song-tournament.png', width: 1200, height: 630, alt: "Song Tournament signed-in home with the fictional band The Midnight Satellites." }] },
  twitter: { card: 'summary_large_image', title: "Song Tournament", description: "Keep your band’s songs, polls, and set lists together in one private workspace.", images: [{ url: 'https://song-tournament.vercel.app/song-tournament.png', alt: "Song Tournament signed-in home with the fictional band The Midnight Satellites." }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
