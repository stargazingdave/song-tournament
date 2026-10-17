import { BandSession } from "@/components/bands/BandSession";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Your bands · Song Tournament",
    template: "%s · Song Tournament",
  },
};
export default function BandsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BandSession>{children}</BandSession>;
}
