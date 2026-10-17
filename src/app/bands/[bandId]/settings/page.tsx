import type { Metadata } from "next";
export const metadata: Metadata = { title: "Band settings" };

import { BandSettings } from "@/components/bands/BandSettings";
export default function SettingsPage() {
  return <BandSettings />;
}
