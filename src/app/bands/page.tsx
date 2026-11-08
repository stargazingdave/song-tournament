"use client";
import { useBandSession } from "@/components/bands/BandSession";
import { BandsHome } from "@/components/bands/BandsHome";
export default function BandsPage() {
  const { state } = useBandSession();
  return <BandsHome state={state} />;
}
