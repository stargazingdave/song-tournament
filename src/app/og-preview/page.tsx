"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BandsHome } from "@/components/bands/BandsHome";
import { Button } from "@/components/ui/button";
import { previewState, previewUser } from "./fixture";
const ignoreLogout = () => {};
export default function SongPreview() {
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (previewRef.current) previewRef.current.dataset.ready = "true"; }, []);
  return <div id="og-preview" ref={previewRef} className="shell" style={{ width: 1200, height: 630, minHeight: 630, overflow: "hidden" }}>
    <style>{`nextjs-portal { display: none !important; }`}</style>
    <AppHeader prefetch={false} memberName={previewUser.display_name} busy={false} onLogout={ignoreLogout}>
      <Button asChild variant="ghost" size="sm"><Link href="/bands" prefetch={false}>All bands</Link></Button>
    </AppHeader>
    <main className="page-content bands-page"><BandsHome state={previewState} prefetch={false} /></main>
  </div>;
}
