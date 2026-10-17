import type { Metadata } from "next";
import { CreateSet } from "@/components/sets/CreateSet";
export const metadata: Metadata = { title: "Create a set" };
export default function Page() {
  return <CreateSet />;
}
