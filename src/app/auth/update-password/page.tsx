"use client";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { useRouter } from "next/navigation";
export default function UpdatePasswordPage() {
  const router = useRouter();
  return <LoginScreen initialMode="update" onAuthenticated={async () => { router.replace("/bands"); }} />;
}
