import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface text-on-surface">
      <h1 className="text-4xl font-bold font-headline-sm mb-2">404</h1>
      <p className="text-on-surface-variant font-body-md mb-6">Page not found</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

