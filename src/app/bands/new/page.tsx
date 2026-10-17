import type { Metadata } from "next";
export const metadata: Metadata = { title: "Create a band" };

import { BandEntryForm } from "@/components/bands/BandEntryForm";
export default function NewBandPage() {
  return <BandEntryForm mode="create" />;
}
