import type { Metadata } from "next";
export const metadata: Metadata = { title: "Songs" };

import { WorkspaceContent } from "@/components/bands/WorkspaceContent";
export default function Page() {
  return <WorkspaceContent section="songs" />;
}
