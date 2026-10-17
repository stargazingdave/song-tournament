import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sets" };

import { WorkspaceContent } from "@/components/bands/WorkspaceContent";
export default function Page() {
  return <WorkspaceContent section="sets" />;
}
