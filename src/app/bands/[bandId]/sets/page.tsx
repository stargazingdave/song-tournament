import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sets" };

import { SetsIndex } from "@/components/sets/SetsIndex";
export default function Page() {
  return <SetsIndex />;
}
