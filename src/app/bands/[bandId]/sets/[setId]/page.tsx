import type { Metadata } from "next";
import { SetDetail } from "@/components/sets/SetDetail";
export const metadata: Metadata = { title: "Set list" };
export default function Page() {
  return <SetDetail />;
}
