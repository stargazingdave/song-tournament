import { BandWorkspace } from "@/components/bands/BandWorkspace";
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BandWorkspace>{children}</BandWorkspace>;
}
