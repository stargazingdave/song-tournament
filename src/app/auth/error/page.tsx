import Link from "next/link";
export default function AuthErrorPage() {
  return <main className="login-page"><section className="login-panel">
    <h1>This email link could not be verified</h1>
    <p>The link may have expired or been opened in a different browser. Try signing in or request a new password reset link.</p>
    <Link href="/">Return to sign in</Link>
  </section></main>;
}
