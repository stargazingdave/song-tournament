"use client";
import { LoginScreen } from "@/components/auth/LoginScreen";
export default function UpdatePasswordPage() {
  return <LoginScreen initialMode="update" onAuthenticated={async () => { window.location.assign("/"); }} />;
}
