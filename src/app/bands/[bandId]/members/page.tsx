import type { Metadata } from "next";
export const metadata: Metadata = { title: "Members" };

import { BandMembers } from "@/components/bands/BandMembers";
export default function MembersPage() {
  return <BandMembers />;
}
