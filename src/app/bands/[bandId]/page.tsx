import type { Metadata } from "next";
export const metadata: Metadata = { title: "Band overview" };

import { BandOverview } from "@/components/bands/BandOverview";
export default function BandPage() {
  return <BandOverview />;
}
