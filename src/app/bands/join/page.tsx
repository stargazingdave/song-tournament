import type { Metadata } from "next";
export const metadata: Metadata = { title: "Join a band" };

import { BandEntryForm } from "@/components/bands/BandEntryForm";
export default function JoinBandPage() {
  return <BandEntryForm mode="join" />;
}
