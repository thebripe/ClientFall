import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0e17] px-6 text-center text-slate-200">
      <h1 className="text-xl font-semibold">Couldn&apos;t connect Gmail</h1>
      <p className="max-w-sm text-sm text-slate-400">
        Something went wrong finishing the Google sign-in. This is usually a
        misconfigured redirect URI or OAuth client. Check the server logs and
        try again.
      </p>
      <Link
        href="/"
        className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white"
      >
        Back to login
      </Link>
    </main>
  );
}
